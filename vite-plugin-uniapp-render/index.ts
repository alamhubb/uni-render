/**
 * vite-plugin-uniapp-render
 *
 * Vite 插件 - 自动将无模板的 Vue 组件转换为 render-component 方案
 * 
 * 两步处理：
 * 1. resolveId: 拦截 'vue' 导入，对空模板组件重定向到 'uniapp-render'
 * 2. transform: 转换 render 函数，添加 useVnodeTree 包裹
 */

import type { Plugin } from 'vite'
import { relative } from 'path'
import { readFileSync, existsSync } from 'fs'
import { transformVueSFC } from 'uniapp-render-compiler'

export interface UniRenderOptions {
    /** 是否开启调试日志 */
    debug?: boolean
    /** 要处理的目录，默认 ['pages', 'components'] */
    includeDirs?: string[]
}

/**
 * 检查 Vue 文件是否有模板
 * 简单检查，不需要完整解析
 */
function hasTemplate(vueFilePath: string): boolean {
    if (!existsSync(vueFilePath)) {
        return true // 文件不存在，安全起见认为有模板
    }

    try {
        const content = readFileSync(vueFilePath, 'utf-8')

        // 查找 <template> 标签
        const templateMatch = content.match(/<template[^>]*>([\s\S]*?)<\/template>/)

        if (!templateMatch) {
            return false // 没有 template 标签
        }

        // 检查 template 内容是否为空（只有空白字符）
        const templateContent = templateMatch[1]
        return templateContent.trim().length > 0
    } catch {
        return true // 读取失败，安全起见认为有模板
    }
}

export function uniRender(options: UniRenderOptions = {}): Plugin {
    const {
        debug = false,
        includeDirs = ['pages', 'components']
    } = options

    return {
        name: 'vite-plugin-uniapp-render',
        enforce: 'pre', // 在 UniApp 之前执行

        /**
         * 拦截模块解析，将空模板组件的 'vue' 重定向到 'uniapp-render'
         */
        resolveId(source, importer) {
            // 只处理 'vue' 的导入
            if (source !== 'vue') {
                return null
            }

            // 必须有 importer（调用方文件）
            if (!importer) {
                return null
            }

            // 只处理 .vue 文件
            if (!importer.endsWith('.vue')) {
                return null
            }

            // 检查是否在需要处理的目录中
            const shouldProcess = includeDirs.some(dir =>
                importer.includes(`/${dir}/`) || importer.includes(`\\${dir}\\`)
            )

            if (!shouldProcess) {
                return null
            }

            // 检查是否有模板
            if (hasTemplate(importer)) {
                // 有模板，让 UniApp 处理
                return null
            }

            // 没有模板，重定向到 uniapp-render
            if (debug) {
                console.log(`[vite-plugin-uniapp-render] resolveId: ${relative(process.cwd(), importer)} → 'uniapp-render'`)
            }

            // 返回 uniapp-render 的解析，跳过自己避免循环
            return this.resolve('uniapp-render', importer, { skipSelf: true })
        },

        /**
         * 转换代码，添加 useVnodeTree 包裹
         */
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

            // 使用 compiler 转换
            const result = transformVueSFC(code)

            if (result) {
                if (debug) {
                    console.log(`[vite-plugin-uniapp-render] ✓ 已转换: ${relative(process.cwd(), id)}`)
                    console.log('[vite-plugin-uniapp-render] 转换后代码:')
                    console.log(result)
                }
                return {
                    code: result,
                    map: null
                }
            }

            return null
        }
    }
}

export default uniRender
