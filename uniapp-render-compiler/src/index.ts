/**
 * uniapp-render-compiler
 * 
 * 使用 @vue/compiler-sfc 解析 Vue SFC 文件
 * 使用 OXC + magic-string 进行高性能代码转换
 * 
 * - Page 组件：替换 import 来源 + 替换 defineComponent → defineRenderComponent
 * - 非 Page 组件：只替换 import 来源
 */

import { parse as parseSFC, compileScript, compileTemplate } from '@vue/compiler-sfc'
import { parseSync, Visitor } from 'oxc-parser'
import MagicString from 'magic-string'

interface SFCBlock {
    scriptAttrs: string
    styles: string[]
}

/**
 * 快速替换脚本中的 import from 'vue' → import from 'uniapp-render'
 * 使用 OXC + magic-string，性能极高
 * 适用于非 Page 组件
 */
export function replaceVueImports(code: string): string {
    const result = parseSync('file.ts', code)
    if (result.errors.length > 0) return code

    const s = new MagicString(code)
    let hasChange = false

    for (const imp of result.module.staticImports) {
        if (imp.moduleRequest.value === 'vue') {
            hasChange = true
            // moduleRequest.start/end 包含引号位置，所以替换内容也需要带引号
            s.overwrite(imp.moduleRequest.start, imp.moduleRequest.end, "'uniapp-render'")
        }
    }

    return hasChange ? s.toString() : code
}

/**
 * 转换脚本（Page 组件）
 * 替换 import + 替换 defineComponent → defineRenderComponent
 */
export function transformScriptForPage(code: string): string {
    const result = parseSync('file.ts', code)
    if (result.errors.length > 0) return code

    const s = new MagicString(code)
    let hasDefineComponent = false
    let vueImportNode: any = null
    const vueSpecifiers: string[] = []

    // 1. 使用 Visitor 遍历 AST
    const visitor = new Visitor({
        // 收集 vue 导入的 specifiers
        ImportDeclaration(node: any) {
            if (node.source?.value === 'vue') {
                vueImportNode = node
                for (const spec of node.specifiers || []) {
                    if (spec.type === 'ImportSpecifier' && spec.imported?.name) {
                        vueSpecifiers.push(spec.imported.name)
                    }
                }
            }
        },
        // 检查是否有 defineComponent 调用
        CallExpression(node: any) {
            if (node.callee?.type === 'Identifier' && node.callee.name === 'defineComponent') {
                hasDefineComponent = true
                s.overwrite(node.callee.start, node.callee.end, 'defineRenderComponent')
            }
        }
    })
    visitor.visit(result.program)

    // 2. 如果有 vue 导入，需要处理
    if (vueImportNode) {
        if (hasDefineComponent) {
            // 替换 defineComponent → defineRenderComponent 并更新导入
            const newSpecifiers = vueSpecifiers
                .filter(s => s !== 'defineComponent')
                .concat('defineRenderComponent')
                .sort()
            const newImport = `import { ${newSpecifiers.join(', ')} } from 'uniapp-render'`
            s.overwrite(vueImportNode.start, vueImportNode.end, newImport)
        } else {
            // 只替换模块名
            s.overwrite(vueImportNode.source.start + 1, vueImportNode.source.end - 1, 'uniapp-render')
        }
    }

    return s.toString()
}

/**
 * 转换 Vue SFC 文件
 * 
 * @param vueCode - Vue SFC 代码
 * @param isPage - 是否为 page 页面（pages/ 目录下的组件）
 * @returns 转换后的代码，如果不需要转换返回 null
 */
export function transformVueSFC(vueCode: string, isPage: boolean = false): string | null {
    const { descriptor } = parseSFC(vueCode, { filename: 'anonymous.vue' })

    const hasTemplate = descriptor.template?.content?.trim()
    const scriptContent = descriptor.script?.content

    // 快速返回：没有 script 也没有 template
    if (!scriptContent && !hasTemplate) return null

    const scriptAttrs = descriptor.script?.lang ? ` lang="${descriptor.script.lang}"` : ''
    const styles = descriptor.styles.map(s => `<style${s.scoped ? ' scoped' : ''}>${s.content}</style>`)

    // 情况1：有 template - 需要将 template 转换为 render 函数
    if (hasTemplate && descriptor.template?.ast) {
        const transformedScript = transformScriptWithTemplate(
            scriptContent || '',
            descriptor,
            isPage
        )
        if (!transformedScript) return null
        return buildTransformedSFC({ scriptAttrs, styles }, transformedScript, isPage)
    }

    // 情况2：只有 script（render 函数形式）
    if (scriptContent) {
        const transformedScript = isPage
            ? transformScriptForPage(scriptContent)
            : replaceVueImports(scriptContent)
        return buildTransformedSFC({ scriptAttrs, styles }, transformedScript, isPage)
    }

    return null
}

/**
 * 处理有 template 的组件
 * 使用 @vue/compiler-sfc 的 compileScript 和 compileTemplate
 */
function transformScriptWithTemplate(scriptContent: string, descriptor: any, isPage: boolean): string | null {
    const id = 'uni-render'

    // 1. 编译 Script
    let compiledScript: any
    try {
        compiledScript = compileScript(descriptor, {
            id,
            inlineTemplate: false
        })
    } catch (e: any) {
        // 如果没有 script 标签，手动构造一个空的导出
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
                mode: 'module'
            }
        })
        renderCode = compiledTemplate.code
    }

    // 3. 合并代码
    const scriptCode = compiledScript.content
    return mergeCode(scriptCode, renderCode, isPage)
}

/**
 * 合并 Script 和 Render 代码
 */
function mergeCode(scriptCode: string, renderCode: string, isPage: boolean): string {
    // 1. 处理 Script 代码
    let newScriptCode = scriptCode

    // 查找 export default
    if (newScriptCode.includes('export default')) {
        newScriptCode = newScriptCode.replace('export default', 'const __sfc__ =')
    } else {
        newScriptCode += '\nconst __sfc__ = {};'
    }

    // 2. 处理 Render 代码
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

    // 4. 将所有 from 'vue' 或 from "vue" 替换为 from 'uniapp-render'
    const processedImports = allImports.map(imp =>
        imp.replace(/from ['"]vue['"]/g, "from 'uniapp-render'")
    )

    // 组合
    let result = `
${processedImports.join('\n')}

${scriptParts.body}

${renderParts.body}

__sfc__.render = render

${isPage ?
            `// Page 组件使用 defineRenderComponent，并添加 <render-component> template
import { defineRenderComponent } from 'uniapp-render'
export default defineRenderComponent(__sfc__)`
            :
            `// Component 组件直接导出
export default __sfc__`
        }
`
    return result
}

function buildTransformedSFC(blocks: SFCBlock, transformedScript: string, isPage: boolean): string {
    const styleParts = blocks.styles.join('\n\n')

    // Page 组件：保持 .vue 格式，添加 <render-component> template
    if (isPage) {
        return `<template>
  <render-component :node="node" />
</template>

<script${blocks.scriptAttrs}>
${transformedScript}
</script>
${styleParts ? '\n' + styleParts : ''}`
    }

    // 非 Page 组件：输出纯 .ts 格式（移除 <script> 标签）
    return transformedScript
}
