/**
 * 渲染器模块
 *
 * 核心功能导出
 */

// 核心组合函数
export {
    useVnodeTree,
    getEventHandlers,
    cleanupEventHandlers,
    setupEventProxy,
    getComponentEventMap
} from './useVnodeTree'

// VNode → MPNode 转换器
export { vnodeToMPNode, createConvertContext, EVENT_MAP } from './converter'
export type { ConvertContext } from './converter'

// 递归渲染组件
export { default as RenderNode } from './RenderNode.vue'

// 事件触发
export { triggerEvent, createMpEvent } from './triggerEvent'

// 类型定义
export type { MPNode, SerializedNode } from './serialize'
