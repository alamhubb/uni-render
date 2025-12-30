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
    },

    async writeBundle() {
      // 在 mp-h5 模式下，处理小程序编译产物
      const mpDist = 'dist/dev/mp-weixin'
      const fs = await import('fs')
      const path = await import('path')
      const glob = await import('glob')

      log('Processing WXML files in', mpDist)

      // 查找所有页面的 WXML 文件
      const wxmlFiles = glob.sync(`${mpDist}/pages/**/*.wxml`)
      let processedCount = 0

      for (const filePath of wxmlFiles) {
        const content = fs.readFileSync(filePath, 'utf-8').trim()

        // 检测空模板
        const isEmpty =
          content === '' ||
          content === '<view></view>' ||
          content === '<view class="content"></view>' ||
          /^<view[^>]*>\s*<\/view>$/.test(content)

        if (isEmpty) {
          // 替换为 h 函数渲染模板
          const newContent = `<import src="/templates/render.wxml"/>
<template is="render" data="{{vnodeTree}}" />`

          fs.writeFileSync(filePath, newContent, 'utf-8')
          processedCount++
          log(`✓ ${path.relative(mpDist, filePath)} - 已自动添加 h 函数支持`)
        }
      }

      if (processedCount > 0) {
        console.log(`[uniapp-vue] 已为 ${processedCount} 个页面自动添加 h 函数支持`)
      }
    }
  }
}

export default uniappVue
