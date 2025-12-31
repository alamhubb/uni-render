/**
 * vite-plugin-uniappvue
 * 
 * Vite 插件 - 为 uniapp-vue Custom Renderer 提供支持
 * 
 * 功能：
 * 1. 设置 Vue alias 指向 uniapp-vue
 * 2. 处理空 WXML，替换为 render.wxml 引用（支持 h() 函数）
 */

import type { Plugin, ResolvedConfig } from 'vite'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { sync as globSync } from 'glob'
import { relative } from 'path'

export interface UniappVueOptions {
    /**
     * 是否打印调试日志
     * @default false
     */
    debug?: boolean

    /**
     * 小程序编译输出目录
     * @default 'dist/dev/mp-weixin'
     */
    mpDist?: string
}

export function uniappVue(options: UniappVueOptions = {}): Plugin {
    const {
        debug = false,
        mpDist = 'dist/dev/mp-weixin'
    } = options

    const log = (...args: any[]) => {
        if (debug) {
            console.log('[vite-plugin-uniappvue]', ...args)
        }
    }

    // 使用包名引用，让 mono 或 node_modules 解析
    const uniappVuePackage = 'uniapp-vue'

    return {
        name: 'vite-plugin-uniappvue',
        enforce: 'pre',

        config(config) {
            log('Configuring Vue alias...')

            config.resolve = config.resolve || {}
            config.resolve.alias = config.resolve.alias || {}

            const alias = config.resolve.alias as Record<string, string>
            alias['vue'] = uniappVuePackage

            log('Vue alias set to:', uniappVuePackage)

            return config
        },

        configResolved(resolvedConfig: ResolvedConfig) {
            log('Config resolved')
            log('Vue alias:', (resolvedConfig.resolve.alias as any)['vue'])
        },

        async writeBundle() {
            // 检查输出目录是否存在（小程序打包时才有）
            if (!existsSync(mpDist)) {
                log(`Output directory ${mpDist} not found, skipping WXML processing`)
                return
            }

            log('Processing WXML files in', mpDist)

            // 查找所有页面的 WXML 文件
            const wxmlFiles = globSync(`${mpDist}/pages/**/*.wxml`)
            let processedCount = 0

            for (const filePath of wxmlFiles) {
                const content = readFileSync(filePath, 'utf-8').trim()

                // 检测空模板（使用 template 的页面，WXML 可能是空的）
                const isEmpty =
                    content === '' ||
                    content === '<view></view>' ||
                    content === '<view class="content"></view>' ||
                    /^<view[^>]*>\s*<\/view>$/.test(content)

                if (isEmpty) {
                    // 替换为 render.wxml 引用，支持 Custom Renderer
                    const newContent = `<block>
  <import src="/templates/render.wxml"/>
  <template is="render" data="{{vnodeTree}}" />
</block>`

                    writeFileSync(filePath, newContent, 'utf-8')
                    processedCount++
                    log(`✓ ${relative(mpDist, filePath)} - 已添加 Custom Renderer 支持`)
                }
            }

            if (processedCount > 0) {
                console.log(`[vite-plugin-uniappvue] 已为 ${processedCount} 个页面添加 Custom Renderer 支持`)
            }
        }
    }
}

export default uniappVue
