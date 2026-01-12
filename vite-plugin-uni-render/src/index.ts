/**
 * vite-plugin-uni-render
 *
 * Vite 插件 - 自动将无模板的 Vue 组件转换为 render-component 方案
 *
 * 职责：文件过滤、目录检查、调用 compiler
 * 转换逻辑委托给 uni-render-compiler
 */

import type { Plugin } from 'vite'
import { transformWithEsbuild } from 'vite'
import { relative, resolve, dirname, isAbsolute, basename, join, extname, normalize } from 'pathe'
import { readFileSync, existsSync } from 'fs'
import { transformVueSFC, transformVueSFCWithStyles, RENDER_MODULE } from './uniRenderCompiler.ts'
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
const ES_VERSION = 'ES2022'
const SRC_DIR = 'src'
const PAGES_JSON = 'pages.json'
const VIRTUAL_EXT = '.vue.render.ts'  // 虚拟模块扩展名
const EXCLUDE_RENDER_COMPONENT = 'uni-render/src/components/RenderComponent'  // 排除 RenderComponent.vue（该组件不需要转换）

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
        throw new Error(`[vite-plugin-uni-render] 意外的非 Page 组件: ${id}`)
    }

    const result = transformVueSFC(code, true)
    if (!result) return null

    if (debug) {
        console.log(`[vite-plugin-uni-render] ✓ 已转换(page): ${relative(process.cwd(), id)}`)
        console.log(`[vite-plugin-uni-render] Page 转换后代码:\n${result}`)
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
        console.warn('[vite-plugin-uni-render] pages.json not found at:', pagesJsonPath)
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
            console.log('[vite-plugin-uni-render] Found pages:', Array.from(cachedPagePaths))
        }
    } catch (e: any) {
        console.error('[vite-plugin-uni-render] Failed to parse pages.json:', e.message)
    }

    return cachedPagePaths
}


let singletonDebug = false

export function uniRender(options: UniRenderOptions = {}): Plugin {
    const { debug = false } = options

    singletonDebug = debug

    let root = ''
    // 缓存非 Page 的 .vue 文件转换结果
    const transformedVueCache = new Map<string, string>()
    // 缓存非 Page 的 .vue 文件的 CSS
    const transformedCssCache = new Map<string, string>()
    // 虚拟模块前缀
    const VIRTUAL_PREFIX = '\0uni-render:'
    // CSS 虚拟模块前缀（用于 import 语句）
    const CSS_VIRTUAL_IMPORT_PREFIX = 'virtual:unirender-css:'
    // CSS 虚拟模块内部 ID 前缀（\0 开头，Vite 内部使用）
    const CSS_VIRTUAL_ID_PREFIX = '\0unirender-css:'

    return {
        name: 'vite-plugin-uni-render',
        enforce: 'pre', // 在 UniApp 之前执行

        configResolved(config) {
            root = config.root
            if (debug) {
                console.log(`[vite-plugin-uni-render] 插件已加载 ${PLUGIN_VERSION}`)
            }
            // 重置缓存，以便 HMR 时重新读取
            cachedPagePaths = null
            transformedVueCache.clear()
        },

        /**
         * 拦截模块解析
         * 1. 将非 Page 的 .vue 文件重定向到虚拟模块
         * 2. 将 'vue' 重定向到 'uni-render'（仅限 src 目录下的非入口文件）
         * 3. 处理 CSS 虚拟模块引用
         */
        resolveId(source, importer) {
            // ========== 1. 处理 CSS 虚拟模块 ==========
            if (source.startsWith(CSS_VIRTUAL_IMPORT_PREFIX)) {
                return CSS_VIRTUAL_ID_PREFIX + source.slice(CSS_VIRTUAL_IMPORT_PREFIX.length)
            }

            // ========== 2. 非 Page .vue 重定向到虚拟模块 ==========
            if (extname(source) === '.vue') {
                if (debug) {
                    console.log(`[vite-plugin-uni-render] resolveId 收到 .vue: ${source}, importer: ${importer}`)
                }

                if (basename(source) === 'App.vue') return null

                let fullPath = source
                if (importer && !isAbsolute(source)) {
                    fullPath = resolve(dirname(importer), source)
                }

                if (debug) {
                    console.log(`[vite-plugin-uni-render] .vue 完整路径: ${fullPath}`)
                }

                // 排除 RenderComponent.vue（该组件使用标准 Vue SFC，不需要转换）
                const normalizedPath = normalize(fullPath)
                if (normalizedPath.includes(EXCLUDE_RENDER_COMPONENT)) {
                    if (debug) {
                        console.log(`[vite-plugin-uni-render] 排除 RenderComponent.vue`)
                    }
                    return null
                }

                // 非 Page 组件重定向到虚拟模块（.ts 扩展名）
                const isPage = isPageComponent(fullPath, root)
                if (debug) {
                    console.log(`[vite-plugin-uni-render] 是否为 Page: ${isPage}`)
                }

                if (!isPage) {
                    // 使用 pathe 的 normalize 确保虚拟模块 ID 使用 POSIX 风格路径
                    const normalizedFullPath = normalize(fullPath)
                    const virtualId = VIRTUAL_PREFIX + changeExt(normalizedFullPath, '.vue', VIRTUAL_EXT)
                    if (debug) {
                        console.log(`[vite-plugin-uni-render] 重定向非 Page .vue: ${source} -> ${virtualId}`)
                    }
                    return virtualId
                }
                return null
            }

            // ========== 2. 处理 vue → uni-render 重定向 ==========
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
                // if (normalize(importer).includes(UNIRENDER_PATH)) {
                //     return null
                // }

                // 只处理纯脚本文件，排除 .vue 和入口文件
                if (SCRIPT_EXTS.has(importerExt) &&
                    !ENTRY_FILES.has(importerName)) {
                    if (debug) {
                        console.log(`[vite-plugin-uni-render] 重定向 vue → ${RENDER_MODULE} (from: ${importerName})`)
                    }
                    return { id: RENDER_MODULE, external: false }
                }
            }


            // ========== 3. 处理 CSS 虚拟模块 ==========
            // virtual:unirender-css:xxx.css -> \0unirender-css:xxx.css
            if (source.startsWith(CSS_VIRTUAL_IMPORT_PREFIX) && source.endsWith('.css')) {
                const cssPath = source.slice(CSS_VIRTUAL_IMPORT_PREFIX.length)
                if (debug) {
                    console.log(`[vite-plugin-uni-render] 解析 CSS 虚拟模块: ${cssPath}`)
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
                        console.log(`[vite-plugin-uni-render] 加载 CSS: ${relative(process.cwd(), originalVuePath)}`)
                    }
                    return transformedCssCache.get(originalVuePath)
                }

                // CSS 会在 transform 时被缓存，如果没有就尝试读取
                if (existsSync(originalVuePath)) {
                    const code = readFileSync(originalVuePath, 'utf-8')
                    const { descriptor } = parseSFC(code, { filename: originalVuePath })
                    const styles = descriptor.styles.map(s => s.content).join('\n')
                    if (styles.trim()) {
                        transformedCssCache.set(originalVuePath, styles)
                        if (debug) {
                            console.log(`[vite-plugin-uni-render] 读取 CSS: ${relative(process.cwd(), originalVuePath)}`)
                        }
                        return styles
                    }
                }
                return ''
            }

            // ========== 处理非 Page .vue 虚拟模块 ==========
            if (id.startsWith(VIRTUAL_PREFIX) && id.endsWith(VIRTUAL_EXT)) {
                const tempPath = id.slice(VIRTUAL_PREFIX.length)
                // originalPath 已经是 POSIX 风格（从 resolveId 传递过来）
                const originalPath = changeExt(tempPath, VIRTUAL_EXT, '.vue')

                // 检查缓存
                if (transformedVueCache.has(originalPath)) {
                    return transformedVueCache.get(originalPath)
                }

                // 读取原始 .vue 文件
                const code = readFileSync(originalPath, 'utf-8')

                // 解析 SFC 获取 style 块
                const { descriptor } = parseSFC(code, { filename: originalPath })
                const styles = descriptor.styles.map(s => s.content).join('\n')

                // 缓存 CSS
                if (styles.trim()) {
                    transformedCssCache.set(originalPath, styles)
                }

                // 转换 Vue SFC（非 Page）
                const tsCode = transformVueSFC(code, false)
                if (!tsCode) {
                    console.error(`[vite-plugin-uni-render] 转换失败: ${originalPath}`)
                    return null
                }

                // 添加 CSS 导入（originalPath 已经是 POSIX 风格）
                let finalTsCode = tsCode
                if (styles.trim()) {
                    finalTsCode = `import '${CSS_VIRTUAL_IMPORT_PREFIX}${originalPath}.css'\n${finalTsCode}`
                }

                if (debug) {
                    console.log(`[vite-plugin-uni-render] ✓ 已转换(component): ${relative(process.cwd(), originalPath)}`)
                    console.log(`[vite-plugin-uni-render] TS 代码:\n${finalTsCode}`)
                }

                // 使用 Vite 内置的 esbuild 转换 TS → JS
                const { code: jsCode } = await transformWithEsbuild(finalTsCode, originalPath, {
                    loader: 'ts',
                    target: ES_VERSION
                })

                // 缓存结果
                transformedVueCache.set(originalPath, jsCode)
                return jsCode
            }

            return null
        },

        /**
         * 处理 Page .vue 组件转换
         */
        transform(code, id) {
            if (extname(id) !== '.vue') return null
            if (basename(id) === 'App.vue') return null
            if (basename(id) === 'RenderComponent.vue') return null

            // 只处理 Page 组件
            if (!isPageComponent(id, root)) return null

            if (debug) {
                console.log(`[vite-plugin-uni-render] 开始处理 Page: ${relative(process.cwd(), id)}`)
            }

            const result = transformVueSFCWithStyles(code, true) // isPage = true
            if (!result) return null

            // 缓存 CSS
            if (result.styles.trim()) {
                transformedCssCache.set(id, result.styles)
            }

            // 在 <script> 标签后添加 CSS 虚拟模块导入
            // 规范化路径确保 CSS 虚拟模块 ID 使用 POSIX 风格
            const normalizedId = normalize(id)
            let finalCode = result.code
            if (result.styles.trim()) {
                // 在 <script> 开始标签后插入 CSS 导入
                finalCode = finalCode.replace(
                    /(<script[^>]*>)/,
                    `$1\nimport '${CSS_VIRTUAL_IMPORT_PREFIX}${normalizedId}.css'`
                )
            }

            if (debug) {
                console.log(`[vite-plugin-uni-render] ✓ 已转换(page): ${relative(process.cwd(), id)}`)
                console.log(`[vite-plugin-uni-render] 转换后代码:\n${finalCode}`)
            }

            return { code: finalCode, map: null }
        },

        /**
         * 处理 HMR - 当 .vue 文件变化时，清除缓存并使虚拟模块失效
         */
        handleHotUpdate({ file, server }) {
            if (!file.endsWith('.vue')) return

            // 检查是否是我们处理的 .vue 文件（非 Page 组件）
            if (basename(file) === 'App.vue') return
            if (basename(file) === 'RenderComponent.vue') return
            if (isPageComponent(file, root)) return

            // 使用 pathe 的 normalize 标准化路径（与 resolveId 保持一致）
            const normalizedPath = normalize(file)

            // 清除缓存
            transformedVueCache.delete(normalizedPath)
            transformedCssCache.delete(normalizedPath)

            // 计算虚拟模块 ID（与 resolveId 使用相同的规范化方式）
            const virtualId = VIRTUAL_PREFIX + changeExt(normalizedPath, '.vue', VIRTUAL_EXT)
            const cssVirtualId = CSS_VIRTUAL_IMPORT_PREFIX + normalizedPath + '.css'

            // 使虚拟模块失效
            const mod = server.moduleGraph.getModuleById(virtualId)
            const cssMod = server.moduleGraph.getModuleById(cssVirtualId)

            if (mod) {
                server.moduleGraph.invalidateModule(mod)
                if (debug) {
                    console.log(`[vite-plugin-uni-render] HMR: 使虚拟模块失效 ${virtualId}`)
                }
            }
            if (cssMod) {
                server.moduleGraph.invalidateModule(cssMod)
            }

            // 返回需要更新的模块
            return mod ? [mod] : undefined
        }
    }
}

export default uniRender

