/**
 * vite-plugin-uniapp-render
 *
 * Vite 插件 - 自动将无模板的 Vue 组件转换为 render-component 方案
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

            // 使用 compiler 转换
            const result = transformVueSFC(code)

            if (result) {
                console.log(`[vite-plugin-uniapp-render] ✓ 已转换: ${relative(process.cwd(), id)}`)
                if (debug) {
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
