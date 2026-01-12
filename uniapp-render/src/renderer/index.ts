/**
 * uni-render - 让 UniApp 支持 Vue 渲染函数（h 函数）开发
 *
 * 核心功能：
 * - 自动转换无 template 的组件为渲染函数组件
 * - defineRenderComponent: 智能桥接 render 函数到 UniApp
 * - 完全兼容 Vue 3 标准 API
 */

// ============================================
// Vue 标准 API（导出 @vue/runtime-core 所有内容）
// ============================================
export * from '@vue/runtime-core'

// vModel 指令（从 @vue/runtime-dom 导入）
export {
    vModelText,
    vModelCheckbox,
    vModelRadio,
    vModelSelect,
    vModelDynamic
} from '@vue/runtime-dom'

// ============================================
// 我们覆盖的 API
// ============================================

// 渲染函数组件：和 UniApp 交互，使用 <render-component :node="node" />
export { defineRenderComponent } from './defineRenderComponent'

// ============================================
// 内部工具（通常不需要用户直接使用）
// ============================================
export { render } from './render'
export { renderEvent } from './event'

// ============================================
// 类型定义
// ============================================
export type { RenderNode } from './types'
