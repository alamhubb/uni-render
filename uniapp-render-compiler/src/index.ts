/**
 * uniapp-render-compiler
 * 
 * 使用 @vue/compiler-sfc 解析 Vue SFC 文件
 * 使用 Slime AST 转换 script 内容
 */

import { parse as parseSFC } from '@vue/compiler-sfc'
import { SlimeParser, SlimeCstToAst } from 'slime-parser'
import { SlimeGenerator } from 'slime-generator'
import { SlimeAstTypeName, SlimeAstCreateUtils } from 'slime-ast'
import { templateAstToHFunction } from './template-transform'

interface SFCBlock {
    scriptAttrs: string
    styles: string[]
}

/**
 * 转换 Vue SFC 文件
 * 
 * @param vueCode - Vue SFC 代码
 * @param isPage - 是否为 page 页面（pages/ 目录下的组件）
 * @returns 转换后的代码，如果不需要转换返回 null
 */
export function transformVueSFC(vueCode: string, isPage: boolean = false): string | null {
    try {
        const { descriptor } = parseSFC(vueCode, { filename: 'anonymous.vue' })

        const hasTemplate = descriptor.template?.content?.trim()
        const scriptContent = descriptor.script?.content

        // 快速返回：没有 script 也没有 template
        if (!scriptContent && !hasTemplate) return null

        const scriptAttrs = descriptor.script?.lang ? ` lang="${descriptor.script.lang}"` : ''
        const styles = descriptor.styles.map(s => `<style${s.scoped ? ' scoped' : ''}>${s.content}</style>`)

        // 情况1：有 template - 需要将 template 转换为 render 函数
        if (hasTemplate && descriptor.template?.ast) {
            console.log(`[compiler] 处理有 template 的${isPage ? 'page' : 'component'}`)
            const transformedScript = transformScriptWithTemplate(
                scriptContent || '',
                descriptor.template.ast,
                isPage
            )
            if (!transformedScript) return null
            return buildTransformedSFC({ scriptAttrs, styles }, transformedScript, isPage)
        }

        // 情况2：只有 script（render 函数形式）- 只有 page 才需要转换
        if (scriptContent && isPage) {
            const transformedScript = transformScript(scriptContent)
            if (!transformedScript) return null
            return buildTransformedSFC({ scriptAttrs, styles }, transformedScript, isPage)
        }

        return null
    } catch (e: any) {
        console.error('[compiler] Full error:', e)
        console.error('[compiler] Stack:', e.stack)
        console.warn(`[uniapp-render-compiler] 转换失败: ${e.message}`)
        return null
    }
}

/**
 * 处理有 template 的组件
 * 将 template AST 转换为 render 函数，合并到 script 中
 */
function transformScriptWithTemplate(scriptContent: string, templateAst: any, isPage: boolean): string | null {
    try {
        console.log('[compiler] 开始处理有 template 的组件')

        // 1. 将 template AST 转换为 h() 调用的代码
        const renderFunctionCode = templateAstToHFunction(templateAst)

        console.log('[compiler] 生成的 render 函数代码:', renderFunctionCode.substring(0, 200))

        // 2. 如果没有 script，创建一个基本的组件
        if (!scriptContent.trim()) {
            return `import { h, defineComponent } from 'vue'

export default defineComponent({
  setup() {
    return ${renderFunctionCode}
  }
})`
        }

        // 3. 解析现有的 script
        const parser = new SlimeParser(scriptContent)
        const cst = parser.Program()

        if (!cst || !parser.parsedTokens || parser.parsedTokens.length === 0) {
            console.warn('[compiler] 解析 script 失败，使用简单合并')
            // 降级：简单地在 script 后面追加 render 函数
            return scriptContent + `\n\n// Auto-generated render function\nconst __render = ${renderFunctionCode}\n`
        }

        const cstToAst = new SlimeCstToAst()
        const ast = cstToAst.toProgram(cst) as any
        if (!ast) {
            console.warn('[compiler] AST 转换失败')
            return null
        }

        // 4. 处理导入和添加 render 函数
        // TODO: 更完善的 AST 修改逻辑
        // 目前先用简单的字符串拼接
        const body = processImportsAndExports(ast.body)
        if (!body) return null

        ast.body = body

        // 生成代码
        const result = SlimeGenerator.generator(ast, parser.parsedTokens)

        // 在生成的代码中添加 render 函数
        // 简化方案：在最后添加 render 函数并修改 setup 返回
        return result.code + `\n\n// Auto-generated render function\n// Render: ${renderFunctionCode}\n`

    } catch (e: any) {
        console.error('[compiler] transformScriptWithTemplate 失败:', e.message)
        return null
    }
}

/**
 * 使用 Slime 转换 script
 * 
 * 策略（参考 OVS 的实现，纯 AST 操作）：
 * 1. 收集所有 from 'vue' 和 from 'uniapp-render' 的导入项
 * 2. 合并到一个 from 'uniapp-render' 导入（直接操作 AST）
 * 3. 把 export default defineComponent({...}) 改为 export default defineRenderComponent({...})
 */
function transformScript(scriptContent: string): string | null {
    try {
        const parser = new SlimeParser(scriptContent)
        const cst = parser.Program()

        if (!cst || !parser.parsedTokens || parser.parsedTokens.length === 0) {
            return null
        }

        const cstToAst = new SlimeCstToAst()
        const ast = cstToAst.toProgram(cst) as any
        if (!ast) return null

        // 后处理：处理导入合并和 defineComponent 替换
        const body = processImportsAndExports(ast.body)
        if (!body) return null

        ast.body = body

        // 生成代码
        const result = SlimeGenerator.generator(ast, parser.parsedTokens)
        console.log('[compiler] Generated code:', result.code.substring(0, 300))
        return result.code
    } catch (e: any) {
        console.warn(`[uniapp-render-compiler] 解析失败: ${e.message}`)
        return null
    }
}

/**
 * 处理导入合并和 defineComponent 替换
 * 参考 OVS 的 ensureRequiredImports 实现
 */
function processImportsAndExports(body: any[]): any[] | null {
    // 1. 分离 import 语句和其他语句
    const imports: any[] = []
    const nonImports: any[] = []

    for (const stmt of body) {
        if (stmt.type === SlimeAstTypeName.ImportDeclaration) {
            imports.push(stmt)
        } else {
            nonImports.push(stmt)
        }
    }

    // 2. 收集所有需要从 uniapp-render 导入的 specifiers
    const allSpecifiers = new Set<string>()
    const importsToRemove: any[] = []

    for (const imp of imports) {
        const source = imp.source?.value
        if (source === 'vue' || source === 'uniapp-render') {
            // 收集 specifiers
            if (imp.specifiers) {
                for (const specItem of imp.specifiers) {
                    const spec = specItem.specifier || specItem
                    if (spec.type === SlimeAstTypeName.ImportSpecifier) {
                        const name = spec.imported?.name
                        if (name) {
                            allSpecifiers.add(name)
                            console.log(`[compiler] collected: ${name} from ${source}`)
                        }
                    }
                }
            }
            // 标记这个导入需要删除
            importsToRemove.push(imp)
        }
    }

    // 3. 查找并替换 defineComponent → defineRenderComponent
    let foundDefineComponent = false
    for (const stmt of nonImports) {
        if (stmt.type === SlimeAstTypeName.ExportDefaultDeclaration) {
            const declaration = stmt.declaration
            if (declaration?.type === SlimeAstTypeName.CallExpression &&
                declaration.callee?.type === SlimeAstTypeName.Identifier &&
                declaration.callee.name === 'defineComponent') {

                console.log('[compiler] Found defineComponent, replacing...')
                declaration.callee.name = 'defineRenderComponent'
                if (declaration.callee.raw) {
                    declaration.callee.raw = 'defineRenderComponent'
                }
                if (declaration.callee.loc?.value) {
                    declaration.callee.loc.value = 'defineRenderComponent'
                }
                foundDefineComponent = true
            }
        }
    }

    if (!foundDefineComponent) {
        console.log('[compiler] No defineComponent found')
        return null
    }

    // 4. 调整 specifiers：添加 defineRenderComponent，移除 defineComponent
    allSpecifiers.add('defineRenderComponent')
    allSpecifiers.delete('defineComponent')

    // 5. 过滤掉需要移除的 imports，保留其他 imports
    const remainingImports = imports.filter(imp => !importsToRemove.includes(imp))

    // 6. 创建合并后的导入语句（纯 AST 操作）
    const newSpecifiers = Array.from(allSpecifiers).sort().map(name => ({
        specifier: {
            type: SlimeAstTypeName.ImportSpecifier,
            imported: SlimeAstCreateUtils.createIdentifier(name),
            local: SlimeAstCreateUtils.createIdentifier(name)
        }
    }))

    const mergedImport = {
        type: SlimeAstTypeName.ImportDeclaration,
        specifiers: newSpecifiers,
        source: SlimeAstCreateUtils.createStringLiteral('uniapp-render')
    }

    console.log('[compiler] Merged specifiers:', Array.from(allSpecifiers).sort().join(', '))

    // 7. 返回：合并的导入 + 其他导入 + 非导入语句
    return [mergedImport, ...remainingImports, ...nonImports]
}

function buildTransformedSFC(blocks: SFCBlock, transformedScript: string, isPage: boolean): string {
    const styleParts = blocks.styles.join('\n\n')

    // Page 组件：添加 <render-component> template
    if (isPage) {
        return `<template>
  <render-component :node="node" />
</template>

<script${blocks.scriptAttrs}>
${transformedScript}
</script>
${styleParts ? '\n' + styleParts : ''}`
    }

    // 普通组件：只有 script 和 style
    return `<script${blocks.scriptAttrs}>
${transformedScript}
</script>
${styleParts ? '\n' + styleParts : ''}`
}
