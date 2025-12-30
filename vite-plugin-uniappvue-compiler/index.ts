/**
 * vite-plugin-uniapp-vue-compiler
 * 
 * 编译时插件 - 处理空 WXML 文件
 * 用于 mp-weixin 模式（小程序编译时）
 */

import type { Plugin } from 'vite'
import { readFileSync, writeFileSync } from 'fs'
import { sync as globSync } from 'glob'
import { relative } from 'path'

export interface UniappVueCompilerOptions {
    /**
     * 小程序编译输出目录
     * @default 'dist/dev/mp-weixin'
     */
    mpDist?: string

    /**
     * 是否打印调试日志
     * @default false
     */
    debug?: boolean
}

export function uniappVueCompiler(options: UniappVueCompilerOptions = {}): Plugin {
    const {
        mpDist = 'dist/dev/mp-weixin',
        debug = false
    } = options

    const log = (...args: any[]) => {
        if (debug) {
            console.log('[uniapp-vue-compiler]', ...args)
        }
    }

    return {
        name: 'vite-plugin-uniapp-vue-compiler',
        enforce: 'post',

        async writeBundle() {
            log('Processing WXML files in', mpDist)

            // 查找所有页面的 WXML 文件
            const wxmlFiles = globSync(`${mpDist}/pages/**/*.wxml`)
            let processedCount = 0

            for (const filePath of wxmlFiles) {
                const content = readFileSync(filePath, 'utf-8').trim()

                // 检测空模板
                const isEmpty =
                    content === '' ||
                    content === '<view></view>' ||
                    content === '<view class="content"></view>' ||
                    /^<view[^>]*>\s*<\/view>$/.test(content)

                if (isEmpty) {
                    // 替换为 h 函数渲染模板
                    // 用 block 包裹以符合 XML 规范（只能有一个根元素）
                    const newContent = `<block>
  <import src="/templates/render.wxml"/>
  <template is="render" data="{{vnodeTree}}" />
</block>`

                    writeFileSync(filePath, newContent, 'utf-8')
                    processedCount++
                    log(`✓ ${relative(mpDist, filePath)} - 已自动添加 h 函数支持`)
                }
            }

            if (processedCount > 0) {
                console.log(`[uniapp-vue-compiler] 已为 ${processedCount} 个页面自动添加 h 函数支持`)
            }
        }
    }
}

export default uniappVueCompiler
