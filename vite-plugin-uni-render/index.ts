/**
 * vite-plugin-uni-render
 *
 * Vite 插件 - 自动将 render 函数转换为 useVnodeTree + RenderNode 方案
 *
 * 功能：
 * 1. 检测使用 render 函数的 Vue 组件
 * 2. 自动用 useVnodeTree 包裹 render 函数
 * 3. 自动注入 RenderNode 组件和 template
 */

import type { Plugin } from 'vite'
import { dirname, basename, join, relative } from 'path'
import { existsSync } from 'fs'

export interface UniRenderOptions {
    /** 是否开启调试日志 */
    debug?: boolean
    /** 要处理的目录，默认 ['pages', 'components'] */
    includeDirs?: string[]
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

            // 检查是否有 render 函数返回模式
            if (!hasRenderFunctionPattern(code)) {
                return null
            }

            log(`检测到 render 函数: ${relative(process.cwd(), id)}`)

            try {
                const result = transformVueComponent(code, id)

                if (result) {
                    console.log(`[vite-plugin-uni-render] ✓ 已转换: ${relative(process.cwd(), id)}`)
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
 * 检测代码中是否有 render 函数模式
 *
 * 匹配以下模式：
 * - setup() { return () => h(...) }
 * - setup() { return () => { return h(...) } }
 */
function hasRenderFunctionPattern(code: string): boolean {
    // 检查是否有 setup 函数返回箭头函数的模式
    const patterns = [
        /return\s*\(\s*\)\s*=>\s*h\s*\(/,           // return () => h(
        /return\s*\(\s*\)\s*=>\s*\{[\s\S]*?h\s*\(/, // return () => { ... h(
        /return\s+function\s*\(\s*\)\s*\{[\s\S]*?h\s*\(/, // return function() { ... h(
    ]

    return patterns.some(pattern => pattern.test(code))
}

/**
 * 转换 Vue 组件
 *
 * 将 setup() 返回的 render 函数用 useVnodeTree 包裹
 */
function transformVueComponent(code: string, filePath: string): string | null {
    // 提取 <script> 部分
    const scriptMatch = code.match(/<script([^>]*)>([\s\S]*?)<\/script>/)
    if (!scriptMatch) {
        return null
    }

    const scriptAttrs = scriptMatch[1]
    let scriptContent = scriptMatch[2]

    // 检查是否已经使用了 useVnodeTree
    if (scriptContent.includes('useVnodeTree')) {
        return null
    }

    // 检查是否有 template
    const hasTemplate = /<template>[\s\S]*?<\/template>/.test(code)

    // 如果没有 template 或 template 为空，需要添加
    const templateMatch = code.match(/<template>([\s\S]*?)<\/template>/)
    const templateContent = templateMatch ? templateMatch[1].trim() : ''
    const needsTemplate = !hasTemplate || templateContent === '' ||
        templateContent === '<view></view>' ||
        /^<view[^>]*>\s*<\/view>$/.test(templateContent)

    // 添加 uniapp-render 导入
    if (!scriptContent.includes("from 'uniapp-render'") &&
        !scriptContent.includes('from "uniapp-render"')) {

        // 找到第一个 import 语句的位置
        const importMatch = scriptContent.match(/^(\s*import\s+)/m)
        if (importMatch) {
            const insertPos = scriptContent.indexOf(importMatch[0])
            scriptContent =
                scriptContent.slice(0, insertPos) +
                "import { useVnodeTree, RenderNode } from 'uniapp-render'\n" +
                scriptContent.slice(insertPos)
        } else {
            // 没有 import 语句，添加到开头
            scriptContent = "import { useVnodeTree, RenderNode } from 'uniapp-render'\n" + scriptContent
        }
    }

    // 转换 setup 返回的 render 函数
    // 模式1: return () => h(...)
    scriptContent = scriptContent.replace(
        /(return\s+)(\(\s*\)\s*=>\s*(?:h\s*\([\s\S]*?\)|[\s\S]*?))([\s\n\r]*[,}\)])/g,
        (match, returnPart, renderFn, ending) => {
            // 检查是否是在 setup 内部
            if (isInsideSetup(scriptContent, match)) {
                return `${returnPart}{ vnodeTree: useVnodeTree(${renderFn}), RenderNode }${ending}`
            }
            return match
        }
    )

    // 重建 script 部分
    const newScript = `<script${scriptAttrs}>${scriptContent}</script>`

    // 替换原来的 script
    let result = code.replace(/<script([^>]*)>[\s\S]*?<\/script>/, newScript)

    // 如果需要添加/替换 template
    if (needsTemplate) {
        const renderNodeTemplate = `<template>
  <RenderNode :node="vnodeTree" />
</template>`

        if (hasTemplate) {
            // 替换现有的空 template
            result = result.replace(/<template>[\s\S]*?<\/template>/, renderNodeTemplate)
        } else {
            // 在 script 之前添加 template
            result = renderNodeTemplate + '\n\n' + result
        }
    }

    return result
}

/**
 * 简单检查匹配是否在 setup 函数内部
 */
function isInsideSetup(code: string, match: string): boolean {
    const matchIndex = code.indexOf(match)
    const beforeMatch = code.slice(0, matchIndex)

    // 查找最近的 setup 关键字
    const setupIndex = beforeMatch.lastIndexOf('setup')
    if (setupIndex === -1) {
        return false
    }

    // 检查 setup 后面是否有函数定义
    const afterSetup = beforeMatch.slice(setupIndex)
    return /setup\s*\([^)]*\)\s*\{/.test(afterSetup) ||
        /setup\s*:\s*function\s*\([^)]*\)\s*\{/.test(afterSetup) ||
        /setup\s*:\s*\([^)]*\)\s*=>\s*\{/.test(afterSetup)
}

export default uniRender
