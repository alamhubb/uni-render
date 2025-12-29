/**
 * uniapp-vue-render
 * 
 * 为小程序提供 Vue 3 渲染函数（h 函数）支持
 * 
 * 极简设计：
 * 1. Vue 做 diff 和 patch
 * 2. 我们只响应 Vue 的操作，调用 setData
 */

// ============================================
// 重新导出 Vue 核心 API（从 adapter 获取）
// ============================================
export * from 'uniapp-vue-adapter'

// ============================================
// 导出小程序渲染器（新的极简版）
// ============================================
export {
    createApp,
    render,
    registerSetData,
    getRootNode,
} from './mp-renderer'

// ============================================
// createSSRApp 别名
// ============================================
import { createApp } from './mp-renderer'
export const createSSRApp = createApp

console.log('[uniapp-vue-render] Loaded - 极简小程序渲染器')
