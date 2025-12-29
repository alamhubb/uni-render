/**
 * Vue 兼容层
 * 
 * 导出所有 Vue 核心 API，但替换 createApp 为我们的 Custom Renderer 版本
 * 
 * 使用方法：
 * 1. 在 vite.config.ts 中配置 alias：vue → uniapp-vue/compat
 * 2. 所有 import { createApp } from 'vue' 都会自动使用 Custom Renderer
 */

// 导出所有 Vue 核心 API（保持完全兼容）
export * from '@vue/runtime-core'

// 替换 createApp 和 createSSRApp 为我们的 Custom Renderer 版本
export { createApp, createApp as createSSRApp } from './renderer'

