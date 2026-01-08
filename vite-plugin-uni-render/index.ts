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

    // 检查是否有 setup 返回渲染函数的模式
    const patterns = [
        /return\s*\(\s*\)\s*=>\s*h\s*\(/,                    // return () => h(
        /return\s*\(\s*\)\s*=>\s*\{[\s\S]*?return\s+h\s*\(/, // return () => { return h(
        /return\s*\(\s*\)\s*=>\s*\{[\s\S]*?h\s*\(/,          // return () => { ... h(
    ]

    return patterns.some(pattern => pattern.test(code))
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
    let scriptContent = scriptMatch[2]

    // 检查是否已经使用了 defineRenderComponent
    if (scriptContent.includes('defineRenderComponent')) {
        return null
    }

    // 1. 替换 from 'vue' → from 'uniapp-render'
    // 处理各种导入形式
    scriptContent = scriptContent.replace(
        /from\s+['"]vue['"]/g,
        "from 'uniapp-render'"
    )

    // 2. 替换 defineComponent → defineRenderComponent
    scriptContent = scriptContent.replace(
        /\bdefineComponent\b/g,
        'defineRenderComponent'
    )

    // 3. 确保导入了 defineRenderComponent
    if (!scriptContent.includes('defineRenderComponent') &&
        !scriptContent.includes("from 'uniapp-render'")) {
        // 在第一个 import 前添加
        const importMatch = scriptContent.match(/^(\s*import\s+)/m)
        if (importMatch) {
            const insertPos = scriptContent.indexOf(importMatch[0])
            scriptContent =
                scriptContent.slice(0, insertPos) +
                "import { defineRenderComponent, ref, h } from 'uniapp-render'\n" +
                scriptContent.slice(insertPos)
        }
    }

    // 提取 style 部分（如果有）
    const styleMatch = code.match(/<style[^>]*>[\s\S]*?<\/style>/g)
    const styleParts = styleMatch ? styleMatch.join('\n\n') : ''

    // 构建新的 .vue 文件
    const result = `<template>
  <render-component :node="node" />
</template>

<script${scriptAttrs}>${scriptContent}</script>
${styleParts ? '\n' + styleParts : ''}`

    return result
}

export default uniRender
