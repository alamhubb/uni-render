/**
 * uniapp-vue-render
 * 
 * 为 uni-app 小程序提供 Vue 3 渲染函数（h 函数）支持
 * 
 * 功能：
 * 1. 重新导出 uniapp-vue-adapter 的所有内容
 * 2. 提供自定义渲染器（渲染到 MPDocument）
 * 3. 导出 createApp 和 createSSRApp
 */

// ============================================
// 重新导出 uniapp-vue-adapter 的所有内容
// ============================================
export * from 'uniapp-vue-adapter'

// ============================================
// 导出自定义渲染器
// ============================================
export { render, createApp } from './renderer'

// ============================================
// 导出 createSSRApp（指向自定义渲染器的 createApp）
// ============================================
import { createApp } from './renderer'
export const createSSRApp = createApp

console.log('[uniapp-vue-render] Loaded - providing Vue 3 + custom renderer (MPDocument)')
