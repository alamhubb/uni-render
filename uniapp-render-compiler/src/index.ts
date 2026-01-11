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
 * 转换结果，包含代码和样式
 */
export interface TransformResult {
    code: string
    styles: string  // 纯 CSS 内容（无 <style> 标签）
}

// OXC 解析器使用的虚拟文件名（用于确定解析器类型和错误报告）
const VIRTUAL_TS_FILE = 'virtual.ts'

// 渲染模块路径（vue 导入会被替换为这个路径）
export const RENDER_MODULE = 'uniapp-render'



/**
 * 快速替换脚本中的 import from 'vue' → import from 'uniapp-render'
 * 使用 OXC + magic-string，性能极高
 * 适用于非 Page 组件
 */
export function replaceVueImports(code: string): string {
    const result = parseSync(VIRTUAL_TS_FILE, code)
    if (result.errors.length > 0) return code

    const s = new MagicString(code)
    let hasChange = false

    for (const imp of result.module.staticImports) {
        if (imp.moduleRequest.value === 'vue') {
            hasChange = true
            // moduleRequest.start/end 包含引号位置，所以替换内容也需要带引号
            s.overwrite(imp.moduleRequest.start, imp.moduleRequest.end, `'${RENDER_MODULE}'`)
        }
    }

    return hasChange ? s.toString() : code
}

/**
 * 转换脚本（Page 组件）
 * 替换 import + 替换 defineComponent → defineRenderComponent
 */
export function transformScriptForPage(code: string): string {
    const result = parseSync(VIRTUAL_TS_FILE, code)
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
            const newImport = `import { ${newSpecifiers.join(', ')} } from '${RENDER_MODULE}'`
            s.overwrite(vueImportNode.start, vueImportNode.end, newImport)
        } else {
            // 只替换模块名
            s.overwrite(vueImportNode.source.start + 1, vueImportNode.source.end - 1, RENDER_MODULE)
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
    const result = transformVueSFCWithStyles(vueCode, isPage)
    return result?.code ?? null
}

/**
 * 转换 Vue SFC 文件，返回代码和样式
 *
 * @param vueCode - Vue SFC 代码
 * @param isPage - 是否为 page 页面（pages/ 目录下的组件）
 * @returns 转换结果，包含 code 和 styles
 */
export function transformVueSFCWithStyles(vueCode: string, isPage: boolean = false): TransformResult | null {
    const { descriptor } = parseSFC(vueCode, { filename: 'anonymous.vue' })

    const hasTemplate = descriptor.template?.content?.trim()
    const scriptContent = descriptor.script?.content

    // 快速返回：没有 script 也没有 template
    if (!scriptContent && !hasTemplate) return null

    // 强制使用 lang="ts"，因为 compileScript 输出的代码可能包含 TS 语法
    const scriptAttrs = ' lang="ts"'
    // 提取纯 CSS 内容（无 <style> 标签）
    const styles = descriptor.styles.map(s => s.content).join('\n')
    // 旧格式（带 <style> 标签），用于兼容
    const styleBlocks = descriptor.styles.map(s => `<style${s.scoped ? ' scoped' : ''}>${s.content}</style>`)

    // 情况1：有 template - 需要将 template 转换为 render 函数
    if (hasTemplate && descriptor.template?.ast) {
        const transformedScript = transformScriptWithTemplate(
            scriptContent || '',
            descriptor,
            isPage
        )
        if (!transformedScript) return null
        const code = buildTransformedSFC({ scriptAttrs, styles: styleBlocks }, transformedScript, isPage)
        return { code, styles }
    }

    // 情况2：只有 script（render 函数形式）
    if (scriptContent) {
        const transformedScript = isPage
            ? transformScriptForPage(scriptContent)
            : replaceVueImports(scriptContent)
        const code = buildTransformedSFC({ scriptAttrs, styles: styleBlocks }, transformedScript, isPage)
        return { code, styles }
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
            inlineTemplate: false,
            isProd: true  // 生产模式：避免生成 __isScriptSetup 保护标记
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
                mode: 'module',
                hoistStatic: false,  // 禁用静态提升，生成 VNode 而不是静态 HTML
                bindingMetadata: compiledScript.bindings  // 传入绑定信息，生成 $setup.xxx 访问方式
            }
        })
        renderCode = compiledTemplate.code
    }

    // 3. 合并代码
    const scriptCode = compiledScript.content
    return mergeCode(scriptCode, renderCode, isPage)
}

/**
 * 使用 AST 重命名冲突的变量名
 * 避免与 UniApp 编译器注入的变量冲突
 */
const RENAME_IDENTIFIERS = ['_resolveComponent', '_openBlock', '_createElementBlock']
const RENAME_SUFFIX = '2Render'

function renameConflictingIdentifiers(code: string): string {
    const result = parseSync(VIRTUAL_TS_FILE, code)
    if (result.errors.length > 0) return code

    const s = new MagicString(code)
    let hasChange = false

    // 收集 ImportSpecifier 中 local 的位置（不需要重复处理）
    const importLocalPositions = new Set<string>()

    const visitor = new Visitor({
        // 处理导入语句中的 as 重命名
        ImportSpecifier(node: any) {
            if (RENAME_IDENTIFIERS.includes(node.local?.name)) {
                s.overwrite(node.local.start, node.local.end, node.local.name + RENAME_SUFFIX)
                hasChange = true
                importLocalPositions.add(`${node.local.start}-${node.local.end}`)
            }
        },
        // 处理函数调用处
        CallExpression(node: any) {
            if (node.callee?.type === 'Identifier' && RENAME_IDENTIFIERS.includes(node.callee.name)) {
                const posKey = `${node.callee.start}-${node.callee.end}`
                if (!importLocalPositions.has(posKey)) {
                    s.overwrite(node.callee.start, node.callee.end, node.callee.name + RENAME_SUFFIX)
                    hasChange = true
                }
            }
        }
    })
    visitor.visit(result.program)

    return hasChange ? s.toString() : code
}

/**
 * 合并 Script 和 Render 代码（全部使用 AST）
 */
function mergeCode(scriptCode: string, renderCode: string, isPage: boolean): string {
    // 1. 使用 AST 处理 Script 代码：export default → const __sfc__ =
    const scriptResult = parseSync(VIRTUAL_TS_FILE, scriptCode)
    const scriptMagic = new MagicString(scriptCode)
    let hasExportDefault = false

    const scriptVisitor = new Visitor({
        ExportDefaultDeclaration(node: any) {
            hasExportDefault = true
            // 替换 export default 为 const __sfc__ =
            scriptMagic.overwrite(node.start, node.declaration.start, 'const __sfc__ = ')
        },
        // 替换 vue → uniapp-render
        ImportDeclaration(node: any) {
            if (node.source?.value === 'vue') {
                scriptMagic.overwrite(node.source.start, node.source.end, `'${RENDER_MODULE}'`)
            }
        }
    })
    if (scriptResult.errors.length === 0) {
        scriptVisitor.visit(scriptResult.program)
    }

    let newScriptCode = scriptMagic.toString()
    if (!hasExportDefault) {
        const appendMagic = new MagicString(newScriptCode)
        appendMagic.append('\nconst __sfc__ = {};')
        newScriptCode = appendMagic.toString()
    }

    // 2. 使用 AST 处理 Render 代码：export function render → function render
    const renderResult = parseSync(VIRTUAL_TS_FILE, renderCode)
    const renderMagic = new MagicString(renderCode)

    const renderVisitor = new Visitor({
        ExportNamedDeclaration(node: any) {
            // 处理 export function render
            if (node.declaration?.type === 'FunctionDeclaration' &&
                node.declaration.id?.name === 'render') {
                // 移除 export 关键字
                renderMagic.overwrite(node.start, node.declaration.start, '')
            }
        },
        // 替换 vue → uniapp-render
        ImportDeclaration(node: any) {
            if (node.source?.value === 'vue') {
                renderMagic.overwrite(node.source.start, node.source.end, `'${RENDER_MODULE}'`)
            }
        }
    })
    if (renderResult.errors.length === 0) {
        renderVisitor.visit(renderResult.program)
    }

    const newRenderCode = renderMagic.toString()

    // 3. 使用 AST 分离 imports 和 body
    const extractImportsAndBody = (code: string): { imports: string[], body: string } => {
        const result = parseSync(VIRTUAL_TS_FILE, code)
        if (result.errors.length > 0) {
            return { imports: [], body: code }
        }

        const magic = new MagicString(code)
        const imports: string[] = []

        for (const stmt of result.program.body) {
            if (stmt.type === 'ImportDeclaration') {
                imports.push(code.slice(stmt.start, stmt.end))
                magic.remove(stmt.start, stmt.end)
            }
        }

        return { imports, body: magic.toString().trim() }
    }

    const scriptParts = extractImportsAndBody(newScriptCode)
    const renderParts = extractImportsAndBody(newRenderCode)

    // 4. 合并 imports（已在 visitor 中处理了 vue → uniapp-render）
    const allImports = [...scriptParts.imports, ...renderParts.imports]

    // 5. 使用 magic-string 组合最终代码
    const finalMagic = new MagicString('')

    // imports
    for (const imp of allImports) {
        finalMagic.append(imp + '\n')
    }
    finalMagic.append('\n')

    if (isPage) {
        // Page 组件：使用本地 defineRenderComponent 包装（直接透传）
        finalMagic.append('function createComponent2Render() {\n')
        for (const line of scriptParts.body.split('\n')) {
            finalMagic.append('  ' + line + '\n')
        }
        finalMagic.append('\n')
        for (const line of renderParts.body.split('\n')) {
            finalMagic.append('  ' + line + '\n')
        }
        finalMagic.append('\n')
        finalMagic.append('  __sfc__.render = render\n')
        finalMagic.append('  return __sfc__\n')
        finalMagic.append('}\n\n')
        // 导入本地的 defineRenderComponent（方便测试）
        finalMagic.append("import { defineRenderComponent } from '" + RENDER_MODULE +"'\n")
        finalMagic.append('export default defineRenderComponent(createComponent2Render())\n')

        // 自执行函数版本（不用 defineRenderComponent）：
        // finalMagic.append('export default (function createComponent2Render() {\n')
        // ...
        // finalMagic.append('})()\n')
    } else {
        // 非 Page 组件：只合并，不包装
        finalMagic.append(scriptParts.body + '\n\n')
        finalMagic.append(renderParts.body + '\n\n')
        finalMagic.append('__sfc__.render = render\n')
        finalMagic.append('export default __sfc__\n')
    }

    let result = finalMagic.toString()
    // 6. 重命名冲突的标识符
    result = renameConflictingIdentifiers(result)

    return result
}

function buildTransformedSFC(blocks: SFCBlock, transformedScript: string, isPage: boolean): string {
    // Page 组件：使用 <render-component> 模板，不拼接 <style> 块（CSS 通过虚拟模块导入）
    if (isPage) {
        return `<template>
  <render-component :node="node" />
</template>

<script${blocks.scriptAttrs}>
${transformedScript}
</script>`
    }

    // 非 Page 组件：返回纯 TS 代码（不需要 .vue 格式，由虚拟模块处理）
    return transformedScript
}
