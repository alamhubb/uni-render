/**
 * uniapp-render - 让 UniApp 支持 Vue 渲染函数（h 函数）开发
 *
 * 核心功能：
 * - useRenderNode: 在逻辑层执行 render 函数，返回可序列化的 MPNode
 * - RenderNode: 递归渲染组件，接收 MPNode 数据
 *
 * 兼容微信小程序：
 * - 不传递函数，只传递纯 JSON 数据
 * - 事件通过 eventId 映射，存储在全局对象中
 *
 * 使用方式：
 * ```vue
 * <template>
 *   <RenderNode :node="node" />
 * </template>
 *
 * <script setup>
 * import { h, ref } from 'vue'
 * import { useRenderNode, RenderNode } from 'uniapp-render'
 *
 * const count = ref(0)
 *
 * const { node } = useRenderNode(() =>
 *   h('view', {}, [
 *     h('text', {}, `计数: ${count.value}`),
 *     h('button', { onClick: () => count.value++ }, '+1')
 *   ])
 * )
 * </script>
 * ```
 */

// ============================================
// 核心 API
// ============================================

// Hook：在逻辑层执行 render，返回 MPNode
export { useRenderNode } from './renderer/useRenderNode'
export type { UseRenderNodeReturn } from './renderer/useRenderNode'

// 组件：渲染 MPNode 数据
export { default as RenderNode } from './components/RenderNode.vue'

// 简单测试组件
export { default as SimpleDiv } from './components/SimpleDiv.vue'
export { default as SimpleTest } from './components/SimpleTest.vue'

// ============================================
// 事件管理
// ============================================

export {
    getEventHandlers,
    cleanupEventHandlers,
    getComponentEventMap,
    triggerEventById,
    setupEventProxy,
} from './renderer/useRenderNode'

// ============================================
// 工具函数
// ============================================

// VNode → MPNode 转换器
export { vnodeToMPNode, createConvertContext, EVENT_MAP } from './renderer/converter'
export type { ConvertContext } from './renderer/converter'

// 事件工具
export { triggerEvent, createMpEvent } from './renderer/triggerEvent'

// ============================================
// 类型定义
// ============================================

export type { MPNode, SerializedNode } from './renderer/serialize'

// ============================================
// UniApp 内部函数（强制导出以避免 tree-shaking）
// 用于 miniprogram-runtime 解析 u-p 属性
// ============================================