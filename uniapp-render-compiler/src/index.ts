/**
 * uniapp-render-compiler
 * 
 * 使用 @vue/compiler-sfc 解析 Vue SFC 文件
 * 使用 Slime AST 转换 script 内容
 */

import { parse as parseSFC } from '@vue/compiler-sfc'
import * as vueShared from '@vue/shared'
import { SlimeParser, SlimeCstToAst } from 'slime-parser'
import { SlimeGenerator } from 'slime-generator'
import { SlimeAstTypeName, SlimeAstCreateUtils } from 'slime-ast'

interface SFCBlock {
    scriptAttrs: string
    styles: string[]
}

/**
 * 转换 Vue SFC 文件
 * 
 * @returns 转换后的代码，如果不需要转换返回 null
 */
export function transformVueSFC(vueCode: string): string | null {
    try {
        const { descriptor } = parseSFC(vueCode, { filename: 'anonymous.vue' })

        // 快速返回：有 template 或没有 script → 不处理
        const hasTemplate = descriptor.template?.content?.trim()
        const scriptContent = descriptor.script?.content
        if (hasTemplate || !scriptContent) return null

        // 构建需要的信息
        const scriptAttrs = descriptor.script?.lang ? ` lang="${descriptor.script.lang}"` : ''
        const styles = descriptor.styles.map(s => `<style${s.scoped ? ' scoped' : ''}>${s.content}</style>`)

        // 转换 script
        const transformedScript = transformScript(scriptContent)
        if (!transformedScript) return null

        // 构建新的 SFC
        return buildTransformedSFC({ scriptAttrs, styles }, transformedScript)
    } catch (e: any) {
        console.error('[compiler] Full error:', e)
        console.error('[compiler] Stack:', e.stack)
        console.warn(`[uniapp-render-compiler] 转换失败: ${e.message}`)
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

function buildTransformedSFC(blocks: SFCBlock, transformedScript: string): string {
    const styleParts = blocks.styles.join('\n\n')

    return `<template>
  <render-component :node="node" />
</template>

<script${blocks.scriptAttrs}>
${transformedScript}
</script>
${styleParts ? '\n' + styleParts : ''}`
}
