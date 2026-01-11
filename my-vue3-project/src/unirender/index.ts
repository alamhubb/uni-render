/**
 * 渲染器模块
 *
 * 核心功能导出
 */

// Custom Renderer
export { render } from './render'
export { defineRenderComponent } from './defineRenderComponent'

// 事件系统
export { renderEvent } from './event'

// 组件
export { default as RenderComponent } from './RenderComponent.vue'

// 类型定义
export type { RenderNode } from './types'

