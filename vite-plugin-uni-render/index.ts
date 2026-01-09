/**
 * vite-plugin-uni-render
 *
 * Vite 插件 - 自动将无模板的 render 函数 Vue 组件转换为 render-component 方案
 *
 * 功能：
 * 1. 检测没有模板的 Vue 组件（只有 <script>，返回渲染函数）
 * 2. 自动替换 defineComponent → defineRenderComponent
 * 3. 自动替换 from 'vue' → from 'uniapp-render'
 * 4. 自动添加模板 <render-component :node="node" />
 */

import type { Plugin } from 'vite'
import { relative } from 'path'
import { SlimeParser, SlimeCstToAst } from 'slime-parser'
import { SlimeGenerator } from 'slime-generator'
import { SlimeAstCreateUtils, SlimeAstTypeName, type SlimeProgram } from 'slime-ast'

export interface UniRenderOptions {
    /** 是否开启调试日志 */
    debug?: boolean
    /** 要处理的目录，默认 ['pages', 'components'] */
    includeDirs?: string[]
}

// ==================== 工具函数 ====================

/** 检查 AST 中是否使用了 defineRenderComponent */
function usesDefineRenderComponent(ast: SlimeProgram): boolean {
    const code = JSON.stringify(ast)
    return code.includes('defineRenderComponent')
}

/** 检查 AST 中是否使用了 h 函数 */
function usesHFunction(ast: SlimeProgram): boolean {
    const code = JSON.stringify(ast)
    return code.includes('"name":"h"')
}

/** 确保有 defineRenderComponent 的导入 */
function ensureDefineRenderComponentImport(imports: any[]): any[] {
    // 检查是否已有 uniapp-render 的导入
    let uniappRenderImport: any = null
    for (const imp of imports) {
        if (imp.type === SlimeAstTypeName.ImportDeclaration) {
            const source = imp.source
            if (source.value === 'uniapp-render') {
                uniappRenderImport = imp
                break
            }
        }
    }

    if (uniappRenderImport) {
        // 已有导入，检查是否有 defineRenderComponent
        const specifiers = uniappRenderImport.specifiers || []
        const has = specifiers.some((s: any) =>
            s.type === SlimeAstTypeName.ImportSpecifier &&
            (s.imported?.name === 'defineRenderComponent' || s.local?.name === 'defineRenderComponent')
        )
        if (!has) {
            specifiers.push({
                type: SlimeAstTypeName.ImportSpecifier,
                imported: SlimeAstCreateUtils.createIdentifier('defineRenderComponent'),
                local: SlimeAstCreateUtils.createIdentifier('defineRenderComponent')
            })
        }
        return imports
    }

    // 没有导入，创建新的
    const newImport = SlimeAstCreateUtils.createImportDeclaration(
        [{
            type: SlimeAstTypeName.ImportSpecifier,
            imported: SlimeAstCreateUtils.createIdentifier('defineRenderComponent'),
            local: SlimeAstCreateUtils.createIdentifier('defineRenderComponent')
        }],
        SlimeAstCreateUtils.createStringLiteral('uniapp-render')
    )
    return [newImport, ...imports]
}

/** 将所有 from 'vue' 的导入改为 from 'uniapp-render' */
function replaceVueImportsToUniappRender(ast: SlimeProgram): void {
    for (const statement of ast.body) {
        if (statement.type === SlimeAstTypeName.ImportDeclaration) {
            const importDecl = statement as any
            if (importDecl.source && importDecl.source.value === 'vue') {
                importDecl.source.value = 'uniapp-render'
            }
        }
    }
}

/** 递归遍历 AST，将所有 defineComponent 替换为 defineRenderComponent */
function replaceDefineComponent(node: any): void {
    if (!node || typeof node !== 'object') return

    // 如果是 defineComponent 调用表达式，替换 callee
    if (node.type === SlimeAstTypeName.CallExpression) {
        const callee = node.callee
        if (callee && callee.type === SlimeAstTypeName.Identifier && callee.name === 'defineComponent') {
            callee.name = 'defineRenderComponent'
        }
    }

    // 递归处理所有子节点
    for (const key in node) {
        if (key === 'loc' || key === 'range') continue  // 跳过位置信息
        const value = node[key]
        if (Array.isArray(value)) {
            value.forEach(item => replaceDefineComponent(item))
        } else if (typeof value === 'object' && value !== null) {
            replaceDefineComponent(value)
        }
    }
}



export function uniRender(options: UniRenderOptions = {}): Plugin {
    const {
        debug = false,
        includeDirs = ['pages', 'components']
    } = options

    const log = (...args: any[]) => {
        if (debug) {
            console.log('[vite-plugin-uni-render]', ...args)
        }
    }

    return {
        name: 'vite-plugin-uni-render',
        enforce: 'pre',

        transform(code, id) {
            // 只处理 .vue 文件
            if (!id.endsWith('.vue')) {
                return null
            }

            // 检查是否在需要处理的目录中
            const shouldProcess = includeDirs.some(dir =>
                id.includes(`/${dir}/`) || id.includes(`\\${dir}\\`)
            )

            if (!shouldProcess) {
                return null
            }

            // 检查是否是无模板的渲染函数组件
            if (!isRenderFunctionComponent(code)) {
                return null
            }

            log(`检测到渲染函数组件: ${relative(process.cwd(), id)}`)

            try {
                const result = transformToRenderComponent(code, id)

                if (result) {
                    console.log(`[vite-plugin-uni-render] ✓ 已转换: ${relative(process.cwd(), id)}`)
                    if (debug) {
                        console.log('[vite-plugin-uni-render] 转换后代码:')
                        console.log(result)
                    }
                    return {
                        code: result,
                        map: null
                    }
                }
            } catch (e: any) {
                console.warn(`[vite-plugin-uni-render] 转换失败 ${id}: ${e.message}`)
            }

            return null
        }
    }
}

/**
 * 检测是否是无模板的渲染函数组件
 * 
 * 条件：
 * 1. 没有 <template> 或 template 为空
 * 2. setup() 返回函数（渲染函数）
 */
function isRenderFunctionComponent(code: string): boolean {
    // 检查是否有有效的 template
    const templateMatch = code.match(/<template[^>]*>([\s\S]*?)<\/template>/)
    const templateContent = templateMatch ? templateMatch[1].trim() : ''

    // 如果有非空模板，不处理
    if (templateContent &&
        templateContent !== '<view></view>' &&
        !/^<view[^>]*>\s*<\/view>$/.test(templateContent)) {
        return false
    }

    // 提取 <script> 内容进行 AST 分析
    const scriptMatch = code.match(/<script[^>]*>([\s\S]*?)<\/script>/)
    if (!scriptMatch) return false

    const scriptContent = scriptMatch[1]

    try {
        // 使用 SlimeParser 解析
        const parser = new SlimeParser(scriptContent)
        const cst = parser.Program()

        if (!cst || !parser.parsedTokens || parser.parsedTokens.length === 0) {
            return false
        }

        // 简单检查：AST 中是否包含 return、箭头函数和 h 调用
        const astStr = JSON.stringify(cst)
        return astStr.includes('return') && astStr.includes('=>') && astStr.includes('"name":"h"')
    } catch (e) {
        // 解析失败，回退到正则
        const patterns = [
            /return\s*\(\s*\)\s*=>\s*h\s*\(/,
            /return\s*\(\s*\)\s*=>\s*\{[\s\S]*?return\s+h\s*\(/,
        ]
        return patterns.some(pattern => pattern.test(scriptContent))
    }
}

/**
 * 转换为 render-component 方案
 * 
 * 1. 替换 from 'vue' → from 'uniapp-render'
 * 2. 替换 defineComponent → defineRenderComponent
 * 3. 添加模板 <render-component :node="node" />
 */
function transformToRenderComponent(code: string, filePath: string): string | null {
    // 提取 <script> 部分
    const scriptMatch = code.match(/<script([^>]*)>([\s\S]*?)<\/script>/)
    if (!scriptMatch) {
        return null
    }

    const scriptAttrs = scriptMatch[1]
    const scriptContent = scriptMatch[2]

    // 检查是否已经使用了 defineRenderComponent
    if (scriptContent.includes('defineRenderComponent')) {
        return null
    }

    try {
        // 使用 SlimeParser 解析
        const parser = new SlimeParser(scriptContent)
        const cst = parser.Program()

        if (!cst || !parser.parsedTokens || parser.parsedTokens.length === 0) {
            return null
        }

        // 转换 CST 到 AST
        const ast = SlimeCstToAst.toProgram(cst) as SlimeProgram

        if (!ast) return null

        // 1. 替换所有 from 'vue' -> from 'uniapp-render'
        replaceVueImportsToUniappRender(ast)

        // 2. 替换所有 defineComponent -> defineRenderComponent
        replaceDefineComponent(ast)

        // 3. 收集所有导入语句
        const imports: any[] = []
        const nonImports: any[] = []
        for (const statement of ast.body) {
            if (statement.type === SlimeAstTypeName.ImportDeclaration) {
                imports.push(statement)
            } else {
                nonImports.push(statement)
            }
        }

        // 4. 确保有 defineRenderComponent 导入
        let finalImports = imports
        if (usesDefineRenderComponent(ast) || usesHFunction(ast)) {
            finalImports = ensureDefineRenderComponentImport(imports)
        }

        // 5. 重建 AST
        ast.body = [...finalImports, ...nonImports] as any

        // 6. 生成代码
        const result = SlimeGenerator.generator(ast, parser.parsedTokens)
        const newScriptContent = result.code

        // 提取 style 部分（如果有）
        const styleMatch = code.match(/<style[^>]*>[\s\S]*?<\/style>/g)
        const styleParts = styleMatch ? styleMatch.join('\n\n') : ''

        // 构建新的 .vue 文件
        return `<template>
  <render-component :node="node" />
</template>

<script${scriptAttrs}>${newScriptContent}</script>
${styleParts ? '\n' + styleParts : ''}`
    } catch (e: any) {
        console.warn(`[vite-plugin-uni-render] AST 转换失败，使用正则方式: ${e.message}`)

        // Fallback 到原来的正则方式
        let newScript = scriptContent
            .replace(/from\s+['"]vue['"]/g, "from 'uniapp-render'")
            .replace(/\bdefineComponent\b/g, 'defineRenderComponent')

        const styleMatch = code.match(/<style[^>]*>[\s\S]*?<\/style>/g)
        const styleParts = styleMatch ? styleMatch.join('\n\n') : ''

        return `<template>
  <render-component :node="node" />
</template>

<script${scriptAttrs}>${newScript}</script>
${styleParts ? '\n' + styleParts : ''}`
    }
}

export default uniRender
