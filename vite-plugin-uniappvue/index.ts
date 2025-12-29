/**
 * vite-plugin-uniappvue
 * 
 * Vite 插件 - 自动配置 Vue alias 指向 uniapp-vue
 * 
 * 使用方式：
 * ```typescript
 * import { uniappVue } from 'uniapp-vue/plugin'
 * 
 * export default defineConfig({
 *   plugins: [uniappVue()]
 * })
 * ```
 */

import type { Plugin, ResolvedConfig } from 'vite'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export interface UniappVueOptions {
  /**
   * 是否打印调试日志
   * @default false
   */
  debug?: boolean
}

/**
 * uniapp-vue Vite 插件
 * 
 * 功能：
 * 1. 自动将 'vue' alias 指向 uniapp-vue
 * 2. 确保所有 Vue 导入使用统一的适配层
 */
export function uniappVue(options: UniappVueOptions = {}): Plugin {
  const { debug = false } = options

  const log = (...args: any[]) => {
    if (debug) {
      console.log('[uniapp-vue]', ...args)
    }
  }

  // uniapp-vue 入口文件路径
  const uniappVuePath = resolve(__dirname, '../uniapp-vue/index.ts')

  return {
    name: 'vite:uniapp-vue',
    enforce: 'pre',

    config(config) {
      log('Configuring Vue alias...')

      // 确保 resolve.alias 存在
      config.resolve = config.resolve || {}
      config.resolve.alias = config.resolve.alias || {}

      // 将 'vue' 指向 uniapp-vue
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
