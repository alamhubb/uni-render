/**
 * vite-plugin-uniapp-render
 *
 * Vite 插件 - 自动将无模板的 Vue 组件转换为 render-component 方案
 *
 * 职责：文件过滤、目录检查、调用 compiler
 * 转换逻辑委托给 uniapp-render-compiler
 */

import type { Plugin } from 'vite'
import { relative, resolve, dirname, isAbsolute, basename, join, extname } from 'pathe'
import { readFileSync, existsSync } from 'fs'
import { transformVueSFC } from 'uniapp-render-compiler'
import { parse as parseSFC } from '@vue/compiler-sfc'

export interface UniRenderOptions {
    /** 是否开启调试日志 */
    debug?: boolean
}

// ========== 常量 ==========
const PLUGIN_VERSION = 'v2.0.1'  // 插件版本号
const SRC_DIR = 'src'
const PAGES_JSON = 'pages.json'
const VIRTUAL_EXT = '.render.temp'  // 虚拟模块扩展名

// 需要替换 import from 'vue' 的纯脚本文件扩展名（不包括 .vue）
const SCRIPT_EXTS = new Set(['.ts', '.js', '.mjs', '.cjs'])

// 入口文件（需要排除，保留原始 vue）
const ENTRY_FILES = new Set(['main.ts', 'main.js', 'main.mjs', 'main.cjs'])

// ========== 缓存 ==========
let cachedPagePaths: Set<string> | null = null
let cachedRoot: string = ''

// ========== 辅助函数 ==========

/**
 * 更改文件扩展名
 */
function changeExt(filePath: string, fromExt: string, toExt: string): string {
    const dir = dirname(filePath)
    const name = basename(filePath, fromExt)
    return join(dir, name + toExt)
}

/**
 * 检查 .vue 文件是否为 Page 组件
 */
function isPageComponent(vuePath: string, root: string): boolean {
    const pagePaths = getPagePaths(root)
    const srcDir = resolve(root, SRC_DIR)
    const relativePath = changeExt(relative(srcDir, vuePath), '.vue', '')
    return pagePaths.has(relativePath)
}

// ========== 处理器函数 ==========

type TransformResult = { code: string; map: null } | null

/**
 * 处理 Page Vue 文件
 */
function transformPageVue(code: string, id: string, root: string, debug: boolean): TransformResult {
    // 确认是 Page 组件，否则逻辑有问题
    if (!isPageComponent(id, root)) {
        throw new Error(`[vite-plugin-uniapp-render] 意外的非 Page 组件: ${id}`)
    }

    const result = transformVueSFC(code, true)
    if (!result) return null

    if (debug) {
        console.log(`[vite-plugin-uniapp-render] ✓ 已转换(page): ${relative(process.cwd(), id)}`)
    }
    return { code: result, map: null }
}

/**
 * 解析 pages.json，获取所有 page 路径
 */
function getPagePaths(root: string): Set<string> {
    if (cachedPagePaths && cachedRoot === root) return cachedPagePaths

    cachedPagePaths = new Set()
    cachedRoot = root

    const pagesJsonPath = resolve(root, SRC_DIR, PAGES_JSON)
    if (!existsSync(pagesJsonPath)) {
        console.warn('[vite-plugin-uniapp-render] pages.json not found at:', pagesJsonPath)
        return cachedPagePaths
    }

    try {
        const content = readFileSync(pagesJsonPath, 'utf-8')
        const pagesJson = JSON.parse(content)

        // 收集 pages 数组中的路径
        if (Array.isArray(pagesJson.pages)) {
            for (const page of pagesJson.pages) {
                if (page.path) {
                    // pages.json 中的路径格式：pages/index/index
                    // 对应的文件：src/pages/index/index.vue
                    cachedPagePaths.add(page.path)
                }
            }
        }

        console.log('[vite-plugin-uniapp-render] Found pages:', Array.from(cachedPagePaths))
    } catch (e: any) {
        console.error('[vite-plugin-uniapp-render] Failed to parse pages.json:', e.message)
    }

    return cachedPagePaths
}

export function uniRender(options: UniRenderOptions = {}): Plugin {
    const { debug = false } = options

    let root = ''
    // 缓存非 Page 的 .vue 文件转换结果
    const transformedVueCache = new Map<string, string>()
    // 缓存非 Page 的 .vue 文件的 CSS
    const transformedCssCache = new Map<string, string>()
    // 虚拟模块前缀
    const VIRTUAL_PREFIX = '\0uniapp-render:'
    // CSS 虚拟模块前缀（用于 import 语句）
    const CSS_VIRTUAL_IMPORT_PREFIX = 'virtual:unirender-css:'
    // CSS 虚拟模块内部 ID 前缀（\0 开头，Vite 内部使用）
    const CSS_VIRTUAL_ID_PREFIX = '\0unirender-css:'

    // 插件加载日志
    console.log(`[vite-plugin-uniapp-render] ✨ 插件函数已调用 ${PLUGIN_VERSION}`)

    return {
        name: 'vite-plugin-uniapp-render',
        enforce: 'pre', // 在 UniApp 之前执行

        configResolved(config) {
            console.log(`[vite-plugin-uniapp-render] 插件已加载 ${PLUGIN_VERSION}`)
            root = config.root
            // 重置缓存，以便 HMR 时重新读取
            cachedPagePaths = null
            transformedVueCache.clear()
        },

        /**
         * 拦截模块解析
         * 1. 将非 Page 的 .vue 文件重定向到虚拟模块
         * 2. 将 'vue' 重定向到 'uniapp-render'（仅限 src 目录下的非入口文件）
         * 3. 处理 CSS 虚拟模块引用
         */
        resolveId(source, importer) {
            // 全局调试
            if (debug && source.includes('uniapp-render')) {
                console.log(`[vite-plugin-uniapp-render][DEBUG] resolveId:`, { source, importer })
            }
            // ========== 1. 处理 .vue 文件导入 ==========
            if (extname(source) === '.vue') {
                // 排除 App.vue（UniApp 入口文件）
                if (basename(source) === 'App.vue') {
                    return null
                }

                // 排除 RenderComponent.vue（我们自己的组件，不需要转换）
                if (basename(source) === 'RenderComponent.vue') {
                    return null
                }

                // 解析完整路径
                let fullPath = source
                if (importer && !isAbsolute(source)) {
                    fullPath = resolve(dirname(importer), source)
                }

                // Page 组件由 transform hook 处理，非 Page 重定向到虚拟模块
                if (!isPageComponent(fullPath, root)) {
                    if (debug) {
                        console.log(`[vite-plugin-uniapp-render] 重定向非 Page .vue: ${source} -> 虚拟模块`)
                    }
                    return VIRTUAL_PREFIX + changeExt(fullPath, '.vue', VIRTUAL_EXT)
                }

                return null
            }

            // ========== 2. 处理 vue → uniapp-render 重定向 ==========
            // 条件：
            //   - 只处理纯脚本文件（.ts, .js, .jsx, .tsx 等）
            //   - 不处理 .vue 文件（因为 UniApp 会在 .vue 中注入代码，由 compiler 处理）
            //   - importer 不在 node_modules
            //   - importer 不是入口文件（main.ts 等）
            if (source === 'vue' && importer &&
                !importer.includes('node_modules')) {
                const importerExt = extname(importer)
                const importerName = basename(importer)

                // 只处理纯脚本文件，排除 .vue 和入口文件
                if (SCRIPT_EXTS.has(importerExt) &&
                    !ENTRY_FILES.has(importerName)) {
                    // 直接返回 uniapp-render 入口的绝对路径
                    const uniappRenderEntry = join(dirname(root), 'uniapp-render/src/index.ts')
                    if (debug) {
                        console.log(`[vite-plugin-uniapp-render] 重定向 vue → uniapp-render (from: ${importerName})`)
                    }
                    return uniappRenderEntry
                }
            }


            // ========== 3. 处理 CSS 虚拟模块 ==========
            // virtual:unirender-css:xxx.css -> \0unirender-css:xxx.css
            if (source.startsWith(CSS_VIRTUAL_IMPORT_PREFIX) && source.endsWith('.css')) {
                const cssPath = source.slice(CSS_VIRTUAL_IMPORT_PREFIX.length)
                if (debug) {
                    console.log(`[vite-plugin-uniapp-render] 解析 CSS 虚拟模块: ${cssPath}`)
                }
                return CSS_VIRTUAL_ID_PREFIX + cssPath
            }

            return null
        },

        /**
         * 加载虚拟模块（非 Page 的 .vue 转换后的 .ts 代码，以及 CSS）
         */
        async load(id) {
            // 处理 CSS 虚拟模块（\0unirender-css:....css 开头）
            if (id.startsWith(CSS_VIRTUAL_ID_PREFIX) && extname(id) === '.css') {
                // 移除前缀和后缀 .css
                const originalVuePath = id.slice(CSS_VIRTUAL_ID_PREFIX.length, -4)

                // 检查缓存
                if (transformedCssCache.has(originalVuePath)) {
                    if (debug) {
                        console.log(`[vite-plugin-uniapp-render] 加载 CSS: ${relative(process.cwd(), originalVuePath)}`)
                    }
                    return transformedCssCache.get(originalVuePath)
                }

                // CSS 会在加载 .vue 时被缓存，如果没有就尝试读取
                const fs = await import('fs')
                if (fs.existsSync(originalVuePath)) {
                    const code = fs.readFileSync(originalVuePath, 'utf-8')
                    const { descriptor } = parseSFC(code, { filename: originalVuePath })
                    const styles = descriptor.styles.map(s => s.content).join('\n')
                    if (styles.trim()) {
                        transformedCssCache.set(originalVuePath, styles)
                        if (debug) {
                            console.log(`[vite-plugin-uniapp-render] 读取 CSS: ${relative(process.cwd(), originalVuePath)}`)
                        }
                        return styles
                    }
                }
                return ''
            }

            // 处理 .vue -> .render.temp 虚拟模块
            if (!id.startsWith(VIRTUAL_PREFIX) || !id.endsWith(VIRTUAL_EXT)) {
                return null
            }

            // 从虚拟模块 ID 恢复原始 .vue 路径
            const tempPath = id.slice(VIRTUAL_PREFIX.length)
            const originalPath = changeExt(tempPath, VIRTUAL_EXT, '.vue')

            // 检查缓存（使用原始路径作为 key）
            if (transformedVueCache.has(originalPath)) {
                return transformedVueCache.get(originalPath)
            }

            // 读取原始 .vue 文件
            const fs = await import('fs')
            const code = fs.readFileSync(originalPath, 'utf-8')

            // 解析 SFC 获取 style 块
            const { descriptor } = parseSFC(code, { filename: originalPath })
            const styles = descriptor.styles.map(s => s.content).join('\n')

            // 缓存 CSS
            if (styles.trim()) {
                transformedCssCache.set(originalPath, styles)
                if (debug) {
                    console.log(`[vite-plugin-uniapp-render] 缓存 CSS: ${relative(process.cwd(), originalPath)}`)
                }
            }

            // 转换为 .ts
            const result = transformVueSFC(code, false) // isPage = false
            if (!result) {
                console.error(`[vite-plugin-uniapp-render] 转换失败: ${originalPath}`)
                return null
            }

            // 如果有 CSS，在 .ts 开头添加 import（使用 virtual: 前缀）
            let finalResult = result
            if (styles.trim()) {
                // 使用 virtual: 前缀 + .css 后缀，后面会在 resolveId 中转换为 \0 前缀
                finalResult = `import '${CSS_VIRTUAL_IMPORT_PREFIX}${originalPath}.css'\n${result}`
            }

            if (debug) {
                console.log(`[vite-plugin-uniapp-render] ✓ 已转换(component→.ts): ${relative(process.cwd(), originalPath)}`)
            }

            // 缓存结果
            transformedVueCache.set(originalPath, finalResult)
            return finalResult
        },

        /**
         * 转换 Page .vue 文件
         * 非 Page .vue 在 resolveId 中已被重定向为虚拟模块
         */
        transform(code, id) {
            if (extname(id) !== '.vue') return null
            if (basename(id) === 'App.vue') return null
            if (basename(id) === 'RenderComponent.vue') return null
            return transformPageVue(code, id, root, debug)
        }
    }
}

export default uniRender

