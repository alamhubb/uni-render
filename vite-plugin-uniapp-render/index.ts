/**
 * vite-plugin-uniapp-render
 *
 * Vite 插件 - 自动将无模板的 Vue 组件转换为 render-component 方案
 *
 * 职责：文件过滤、目录检查、调用 compiler
 * 转换逻辑委托给 uniapp-render-compiler
 */

import type { Plugin } from 'vite'
import { relative, resolve, dirname } from 'path'
import { readFileSync, existsSync } from 'fs'
import { transformVueSFC } from 'uniapp-render-compiler'

export interface UniRenderOptions {
    /** 是否开启调试日志 */
    debug?: boolean
    /** 要处理的目录，默认 ['pages', 'components'] */
    includeDirs?: string[]
}

// 缓存 pages.json 中的 page 路径
let cachedPagePaths: Set<string> | null = null

/**
 * 解析 pages.json，获取所有 page 路径
 */
function getPagePaths(root: string): Set<string> {
    if (cachedPagePaths) return cachedPagePaths

    cachedPagePaths = new Set()

    const pagesJsonPath = resolve(root, 'src/pages.json')
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
    const {
        debug = false,
        includeDirs = ['pages', 'components']
    } = options

    let root = ''

    return {
        name: 'vite-plugin-uniapp-render',
        enforce: 'pre', // 在 UniApp 之前执行

        configResolved(config) {
            root = config.root
            // 重置缓存，以便 HMR 时重新读取
            cachedPagePaths = null
        },

        // 注意：不使用 resolveId hook。
        // 原因：resolveId 会影响所有 import from 'vue'，包括 UniApp 编译模板时生成的。
        // 我们只需要替换用户代码中的 import，这在 transform 阶段由 compiler 完成。

        /**
         * 转换代码
         */
        transform(code, id) {
            // 排除 node_modules 中的文件（包括 uniapp-render 包）
            if (id.includes('node_modules')) {
                return null
            }

            // 处理 .ts 文件：只替换 import from 'vue'
            if (id.endsWith('.ts')) {
                // 只处理 pages/ 或 components/ 目录下的 .ts 文件
                // 不处理 main.ts、App.vue 所在目录等
                const inTargetDir = includeDirs.some(dir =>
                    id.includes(`/${dir}/`) || id.includes(`\\${dir}\\`)
                )
                if (!inTargetDir) {
                    return null
                }

                // 简单替换：import from 'vue' → import from 'uniapp-render'
                if (code.includes("from 'vue'") || code.includes('from "vue"')) {
                    const result = code
                        .replace(/from ['"]vue['"]/g, "from 'uniapp-render'")

                    if (debug) {
                        console.log(`[vite-plugin-uniapp-render] ✓ 已转换(.ts): ${relative(process.cwd(), id)}`)
                    }

                    return {
                        code: result,
                        map: null
                    }
                }
                return null
            }

            // 处理 .vue 文件
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

            // 获取相对路径，用于匹配 pages.json
            // id: D:/project/.../src/pages/index/index.vue
            // pages.json: pages/index/index
            const relativePath = relative(resolve(root, 'src'), id)
                .replace(/\\/g, '/')  // Windows 路径转换
                .replace(/\.vue$/, '') // 移除 .vue 后缀

            // 判断是否为 page（在 pages.json 中配置）
            const pagePaths = getPagePaths(root)
            const isPage = pagePaths.has(relativePath)

            // 使用 compiler 转换
            const result = transformVueSFC(code, isPage)

            if (result) {
                if (debug) {
                    console.log(`[vite-plugin-uniapp-render] ✓ 已转换${isPage ? '(page)' : '(component)'}: ${relative(process.cwd(), id)}`)
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

