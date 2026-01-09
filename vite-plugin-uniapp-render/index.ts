/**
 * vite-plugin-uniapp-render
 *
 * Vite 插件 - 自动将无模板的 Vue 组件转换为 render-component 方案
 * 
 * 职责：文件过滤、目录检查、调用 compiler
 * 转换逻辑委托给 uniapp-render-compiler
 */

import type { Plugin } from 'vite'
import { relative } from 'path'
import { transformVueSFC } from 'uniapp-render-compiler'

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

    return {
        name: 'vite-plugin-uniapp-render',
        enforce: 'pre', // 在 UniApp 之前执行

        // 注意：不使用 resolveId hook。
        // 原因：resolveId 会影响所有 import from 'vue'，包括 UniApp 编译模板时生成的。
        // 我们只需要替换用户代码中的 import，这在 transform 阶段由 compiler 完成。

        /**
         * 转换代码
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
