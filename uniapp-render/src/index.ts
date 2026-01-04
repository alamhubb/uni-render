/**
 * uniapp-render - 让 UniApp 支持 Vue 渲染函数（h 函数）开发
 *
 * 核心功能：
 * - RenderNode: 递归渲染组件，支持两种使用方式
 *   1. 传入 render 函数：<RenderNode :render="() => h('view', {}, 'Hello')" />
 *   2. 传入 MPNode 数据：<RenderNode :node="mpNodeData" />
 *
 * 使用方式：
 * ```vue
 * <template>
 *   <RenderNode :render="renderContent" />
 * </template>
 *
 * <script setup>
 * import { h, ref } from 'vue'
 * import { RenderNode } from 'uniapp-render'
 *
 * const count = ref(0)
 * const renderContent = () => h('view', {}, [
 *   h('text', {}, `计数: ${count.value}`),
 *   h('button', { onClick: () => count.value++ }, '+1')
 * ])
 * </script>
 * ```
 */

// 核心组件
export { default as RenderNode } from './renderer/RenderNode.vue'

// 可选：手动使用的工具函数
export {
    useVnodeTree,
    getEventHandlers,
    cleanupEventHandlers,
    setupEventProxy,
    getComponentEventMap
} from './renderer/useVnodeTree'

// VNode → MPNode 转换器
export { vnodeToMPNode, createConvertContext, EVENT_MAP } from './renderer/converter'
export type { ConvertContext } from './renderer/converter'

// 事件触发
export { triggerEvent, createMpEvent } from './renderer/triggerEvent'

// 类型定义
export type { MPNode, SerializedNode } from './renderer/serialize'