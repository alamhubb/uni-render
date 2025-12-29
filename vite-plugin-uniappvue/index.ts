import type { Plugin } from 'vite'
import * as path from 'node:path'
import * as fs from 'node:fs'

export interface UniVueHOptions {
  // 是否自动注入全局组件
  autoImport?: boolean
}

export function uniAppRender(options: UniVueHOptions = {}): Plugin {
  const { autoImport = true } = options
  
  const platform = process.env.UNI_PLATFORM || ''
  const isMP = /mp/i.test(platform)
  const isH5 = /h5/i.test(platform)
  const isApp = /app/i.test(platform)

  const packageName = 'uni-app-render'
  const VIRTUAL_PREFIX = '\0uni-app-render:'

  // 小程序需要生成的组件
  const mpComponents = ['document']
  if (isMP && !/alipay/i.test(platform)) {
    mpComponents.push('comp')
  }

  return {
    name: 'vite:uni-app-render',
    enforce: 'pre',

    config(config) {
      // 确保 resolve.alias 存在
      config.resolve = config.resolve || {}
      config.resolve.alias = config.resolve.alias || {}
      
      return config
    },

    configResolved(resolvedConfig) {
      if (!isMP) return

      // 配置 rollup output
      if (!resolvedConfig.build.rollupOptions.output) {
        resolvedConfig.build.rollupOptions.output = {}
      }

      const output = resolvedConfig.build.rollupOptions.output
      const chunkTest = new RegExp(`(${mpComponents.join('|')})\\.[jt]s$`)

      if (Array.isArray(output)) {
        output.forEach((item) => {
          const manualChunks = item.manualChunks as any
          item.manualChunks = (id: string, chunk: any) => {
            if (chunkTest.test(id)) {
              return undefined
            }
            return manualChunks?.(id, chunk)
          }
        })
      } else {
        const manualChunks = output.manualChunks as any
        output.manualChunks = (id: string, chunk: any) => {
          if (chunkTest.test(id)) {
            return undefined
          }
          return manualChunks?.(id, chunk)
        }
      }
    },

    buildStart() {
      if (!isMP) return

      // 生成小程序组件入口
      mpComponents.forEach((id) => {
        this.emitFile({
          type: 'chunk',
          id: VIRTUAL_PREFIX + id,
          fileName: `${id}.js`,
        })
      })
    },

    resolveId(id) {
      if (id.startsWith(VIRTUAL_PREFIX)) {
        return id
      }
    },

    load(id) {
      if (id.startsWith(VIRTUAL_PREFIX)) {
        const realName = id.slice(VIRTUAL_PREFIX.length)
        return `export * from '${packageName}/src/mp/${realName}'`
      }
    },

    buildEnd() {
      if (!isMP) return

      // 生成小程序组件配置文件
      mpComponents.forEach((id) => {
        this.emitFile({
          type: 'asset',
          source: JSON.stringify({
            component: true,
            styleIsolation: 'apply-shared',
          }),
          fileName: `${id}.json`,
        })
      })

      // TODO: 生成 wxml 模板文件
      // 这部分需要从 uni-app-react 的模板生成器移植过来
    },
  }
}

export default uniAppRender
