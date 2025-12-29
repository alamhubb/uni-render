/**
 * vite-plugin-uniapp-vue
 * 
 * 运行时插件 - 设置 Vue alias 指向 Custom Renderer
 * 用于 mp-h5 模式（浏览器运行时）
 */

import type { Plugin, ResolvedConfig } from 'vite'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export interface UniappVueOptions {
    debug?: boolean
}

export function uniappVue(options: UniappVueOptions = {}): Plugin {
    const { debug = false } = options

    const log = (...args: any[]) => {
        if (debug) {
            console.log('[uniapp-vue]', ...args)
        }
    }

    const uniappVuePath = resolve(__dirname, '../uniapp-vue/index.ts')

    return {
        name: 'vite-plugin-uniapp-vue',
        enforce: 'pre',

        config(config) {
            log('Configuring Vue alias...')

            config.resolve = config.resolve || {}
            config.resolve.alias = config.resolve.alias || {}

            const alias = config.resolve.alias as Record<string, string>
            alias['vue'] = uniappVuePath

            log('Vue alias set to:', uniappVuePath)

            return config
        },

        configResolved(resolvedConfig: ResolvedConfig) {
            log('Config resolved')
            log('Vue alias:', (resolvedConfig.resolve.alias as any)['vue'])
        }
    }
}

export default uniappVue
