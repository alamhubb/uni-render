/**
 * vite-plugin-uniapp-render
 *
 * Vite 插件 - 自动将无模板的 Vue 组件转换为 render-component 方案
 *
 * 职责：文件过滤、目录检查、调用 compiler
 * 转换逻辑委托给 uniapp-render-compiler
 */

import type { Plugin } from 'vite'
import { relative, resolve, dirname, isAbsolute, basename, join, extname, normalize } from 'pathe'
import { readFileSync, existsSync } from 'fs'
import { transformVueSFC, transformVueSFCWithStyles, RENDER_MODULE } from 'uniapp-render-compiler'
import { parse as parseSFC } from '@vue/compiler-sfc'

export interface UniRenderOptions {
    /** 是否开启调试日志 */
    debug?: boolean
    /** 是否跳过所有处理（用于调试） */
    skip?: boolean
    /** 只启用 vue → unirender 重定向（用于调试） */
    onlyVueRedirect?: boolean
}

// ========== 常量 ==========
const PLUGIN_VERSION = 'v2.0.1'  // 插件版本号
const SRC_DIR = 'src'
const PAGES_JSON = 'pages.json'
const UNIRENDER_PATH = '/unirender/'  // unirender 目录路径模式（用于 normalize 后的路径匹配）

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
        console.log(`[vite-plugin-uniapp-render] Page 转换后代码:\n${result}`)
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

        if (singletonDebug) {
            console.log('[vite-plugin-uniapp-render] Found pages:', Array.from(cachedPagePaths))
        }
    } catch (e: any) {
        console.error('[vite-plugin-uniapp-render] Failed to parse pages.json:', e.message)
    }

    return cachedPagePaths
}


let singletonDebug = false

export function uniRender(options: UniRenderOptions = {}): Plugin {
    const { debug = false, skip = false, onlyVueRedirect = false } = options

    // 如果 skip=true，返回空插件
    if (skip) {
        return {
            name: 'vite-plugin-uniapp-render-skip',
        }
    }

    // 如果 onlyVueRedirect=true，只启用 vue 重定向
    if (onlyVueRedirect) {
        return {
            name: 'vite-plugin-uniapp-render-vue-redirect',
            enforce: 'pre',
            resolveId(source, importer) {
                // 只处理 vue → unirender 重定向
                if (source === 'vue' && importer &&
                    !importer.includes('node_modules')) {
                    const importerExt = extname(importer)
                    const importerName = basename(importer)

                    // 排除 unirender 目录本身（它需要使用原生 vue）
                    if (normalize(importer).includes(UNIRENDER_PATH)) {
                        return null
                    }

                    // 只处理纯脚本文件（.ts/.js 等），自动排除 .vue 文件和入口文件
                    if (SCRIPT_EXTS.has(importerExt) &&
                        !ENTRY_FILES.has(importerName)) {
                        if (debug) {
                            console.log(`[vite-plugin-uniapp-render] 重定向 vue → ${RENDER_MODULE} (from: ${importerName})`)
                        }
                        // 返回 RENDER_MODULE，由 Vite 的 alias 解析
                        return { id: RENDER_MODULE, external: false }
                    }
                }
                return null
            }
        }
    }

    singletonDebug = debug

    let root = ''
    // 缓存 .vue 文件的 CSS
    const transformedCssCache = new Map<string, string>()
    // CSS 虚拟模块前缀（用于 import 语句）
    const CSS_VIRTUAL_IMPORT_PREFIX = 'virtual:unirender-css:'
    // CSS 虚拟模块内部 ID 前缀（\0 开头，Vite 内部使用）
    const CSS_VIRTUAL_ID_PREFIX = '\0unirender-css:'

    return {
        name: 'vite-plugin-uniapp-render',
        enforce: 'pre', // 在 UniApp 之前执行

        configResolved(config) {
            root = config.root
            if (debug) {
                console.log(`[vite-plugin-uniapp-render] 插件已加载 ${PLUGIN_VERSION}`)
            }
            // 重置缓存
            cachedPagePaths = null
            transformedCssCache.clear()
        },

        /**
         * 拦截模块解析
         * 1. 将非 Page 的 .vue 文件重定向到虚拟模块
         * 2. 将 'vue' 重定向到 'uniapp-render'（仅限 src 目录下的非入口文件）
         * 3. 处理 CSS 虚拟模块引用
         */
        resolveId(source, importer) {
            // ========== 1. 处理 CSS 虚拟模块 ==========
            if (source.startsWith(CSS_VIRTUAL_IMPORT_PREFIX)) {
                return CSS_VIRTUAL_ID_PREFIX + source.slice(CSS_VIRTUAL_IMPORT_PREFIX.length)
            }

            // ========== 2. 非 Page .vue 不再重定向，由 transform 处理 ==========
            // （移除了虚拟模块重定向逻辑）

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

                // 排除 unirender 目录本身（它需要使用原生 vue）
                if (normalize(importer).includes(UNIRENDER_PATH)) {
                    return null
                }

                // 只处理纯脚本文件，排除 .vue 和入口文件
                if (SCRIPT_EXTS.has(importerExt) &&
                    !ENTRY_FILES.has(importerName)) {
                    if (debug) {
                        console.log(`[vite-plugin-uniapp-render] 重定向 vue → ${RENDER_MODULE} (from: ${importerName})`)
                    }
                    return { id: RENDER_MODULE, external: false }
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

                // CSS 会在 transform 时被缓存，如果没有就尝试读取
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

            // 非 Page .vue 虚拟模块已移除，改为在 transform 中处理

            return null
        },

        /**
         * 转换 .vue 文件
         * - 非 Page 组件：转换为只有 <script lang="ts"> 的 .vue（无 template）
         * - Page 组件：暂时禁用
         */
        transform(code, id) {
            if (extname(id) !== '.vue') return null
            if (basename(id) === 'App.vue') return null
            if (basename(id) === 'RenderComponent.vue') return null

            // 排除 unirender 目录（unirender 库本身需要使用原生 Vue）
            if (normalize(id).includes(UNIRENDER_PATH)) {
                return null
            }

            // Page 组件暂时不处理
            if (isPageComponent(id, root)) {
                return null
            }

            // ========== 非 Page 组件处理 ==========
            if (debug) {
                console.log(`[vite-plugin-uniapp-render] 开始处理组件: ${relative(process.cwd(), id)}`)
            }

            // 使用 transformVueSFCWithStyles 获取转换结果和样式
            const result = transformVueSFCWithStyles(code, false) // isPage = false
            if (!result) return null

            // 缓存 CSS
            if (result.styles.trim()) {
                transformedCssCache.set(id, result.styles)
            }

            // 构建输出：只有 <script lang="ts"> 的 .vue 格式
            let scriptCode = result.code

            // 添加 CSS 虚拟模块导入
            if (result.styles.trim()) {
                scriptCode = `import '${CSS_VIRTUAL_IMPORT_PREFIX}${id}.css'\n${scriptCode}`
            }

            // 构建最终的 .vue 格式输出（只有 script，无 template）
            const finalCode = `<script lang="ts">\n${scriptCode}\n</script>`

            if (debug) {
                console.log(`[vite-plugin-uniapp-render] ✓ 已转换(component): ${relative(process.cwd(), id)}`)
                console.log(`[vite-plugin-uniapp-render] 转换后代码:\n${finalCode}`)
            }

            return { code: finalCode, map: null }
        },

        /**
         * 处理 HMR - 当 .vue 文件变化时，清除 CSS 缓存
         */
        handleHotUpdate({ file }) {
            if (!file.endsWith('.vue')) return

            // 检查是否是我们处理的 .vue 文件
            if (basename(file) === 'App.vue') return
            if (basename(file) === 'RenderComponent.vue') return

            // 清除 CSS 缓存（transform 会重新处理 .vue 文件）
            transformedCssCache.delete(file)

            if (debug) {
                console.log(`[vite-plugin-uniapp-render] HMR: 清除缓存 ${relative(process.cwd(), file)}`)
            }
        }
    }
}

export default uniRender

