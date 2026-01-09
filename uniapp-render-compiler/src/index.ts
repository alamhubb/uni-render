/**
 * uniapp-render-compiler
 * 
 * 使用 @vue/compiler-sfc 解析 Vue SFC 文件
 * 使用 Slime AST 转换 script 内容
 */

import { parse as parseSFC, compileScript, compileTemplate, SFCScriptCompileOptions } from '@vue/compiler-sfc'
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
                descriptor,
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
 * 使用 @vue/compiler-sfc 的 compileScript 和 compileTemplate
 */
function transformScriptWithTemplate(scriptContent: string, descriptor: any, isPage: boolean): string | null {
    try {
        console.log('[compiler] 使用官方 compileScript + compileTemplate 处理')
        const id = 'uni-render' // 简单的 ID

        // 1. 编译 Script
        let compiledScript: any
        try {
            // 如果只有 template 没有 script，compileScript 需要从 descriptor 中获取
            // 实际上 descriptor 包含了 script 和 scriptSetup
            compiledScript = compileScript(descriptor, {
                id,
                inlineTemplate: false
            })
        } catch (e: any) {
            // 如果没有 script 标签，可能需要手动构造一个空的导出
            if (!descriptor.script && !descriptor.scriptSetup) {
                compiledScript = { content: 'import { defineComponent } from "vue";\nexport default defineComponent({});' }
            } else {
                throw e
            }
        }

        // 2. 编译 Template
        let renderCode = ''
        if (descriptor.template) {
            const compiledTemplate = compileTemplate({
                source: descriptor.template.content,
                filename: 'anonymous.vue',
                id,
                compilerOptions: {
                    mode: 'module',
                    nodeTransforms: [
                        (node: any) => {
                            if (node.type === 1) { // ELEMENT
                                const tagMap: Record<string, string> = {
                                    'div': 'view',
                                    'span': 'text',
                                    'p': 'view',
                                    'h1': 'text',
                                    'h2': 'text',
                                    'h3': 'text',
                                    'h4': 'text',
                                    'h5': 'text',
                                    'h6': 'text',
                                    'a': 'navigator',
                                    'img': 'image',
                                    'button': 'button',
                                    'ul': 'view',
                                    'li': 'view'
                                }
                                if (tagMap[node.tag]) {
                                    node.tag = tagMap[node.tag]
                                }
                            }
                        }
                    ]
                }
            })
            renderCode = compiledTemplate.code
        }

        // 3. 合并代码
        // 我们利用 SlimeParser 来解析并重新组织代码
        // 目标结构：
        //   Imports (Vue, etc)
        //   const __sfc__ = defineComponent(...)
        //   function render(...) { ... }
        //   __sfc__.render = render
        //   export default __sfc__

        const scriptCode = compiledScript.content
        const finalCode = mergeCode(scriptCode, renderCode, isPage)

        return finalCode

    } catch (e: any) {
        console.error('[compiler] transformScriptWithTemplate 失败:', e.message)
        return null
    }
}

/**
 * 合并 Script 和 Render 代码
 */
function mergeCode(scriptCode: string, renderCode: string, isPage: boolean): string {
    // 1. 处理 Script 代码
    // 我们需要把 export default defineComponent(...) 替换为 const __sfc__ = defineComponent(...)
    let newScriptCode = scriptCode

    // 查找 export default
    if (newScriptCode.includes('export default')) {
        newScriptCode = newScriptCode.replace('export default', 'const __sfc__ =')
    } else {
        newScriptCode += '\nconst __sfc__ = {};'
    }

    // 2. 处理 Render 代码
    // compileTemplate 生成的代码包含 import { ... } from "vue" 和 export function render
    // 我们需要把 export function render 改为 function render
    let newRenderCode = renderCode.replace('export function render', 'function render')

    // 3. 清理 imports
    const allImports: string[] = []

    // 辅助函数：分离 import
    const splitImports = (code: string) => {
        const lines = code.split('\n')
        const imports: string[] = []
        const body: string[] = []
        lines.forEach(line => {
            if (line.trim().startsWith('import ') || line.trim().startsWith('import{')) {
                imports.push(line)
            } else {
                body.push(line)
            }
        })
        return { imports, body: body.join('\n') }
    }

    const scriptParts = splitImports(newScriptCode)
    const renderParts = splitImports(newRenderCode)

    allImports.push(...scriptParts.imports)
    allImports.push(...renderParts.imports)

    // 组合
    let result = `
${allImports.join('\n')}

${scriptParts.body}

${renderParts.body}

__sfc__.render = render

// Page 组件需要 defineRenderComponent
${isPage ?
            `import { defineRenderComponent } from 'uniapp-render'
export default defineRenderComponent(__sfc__)`
            :
            `export default __sfc__`
        }
`
    return result
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
