/**
 * uniapp-render - 让 UniApp 支持 Vue 渲染函数（h 函数）开发
 *
 * 核心功能：
 * - useRender: 使用 Custom Renderer 渲染组件
 * - renderEvent: 事件触发（供 RenderComponent 调用）
 *
 * 使用方式：
 * ```vue
 * <template>
 *   <render-component :node="node" />
 * </template>
 *
 * <script setup>
 * import { ref as vueRef } from 'vue'
 * import { ref, h, useRender, watch } from 'uniapp-render'
 *
 * const InnerComponent = {
 *   setup() {
 *     const count = ref(0)
 *     return () => h('view', { onClick: () => count.value++ }, count.value)
 *   }
 * }
 *
 * const node = useRender(InnerComponent)
 * </script>
 * ```
 */

// ============================================
// Custom Renderer
// ============================================
export { render } from './renderer/render'

// ============================================
// 事件系统（供 RenderComponent 调用）
// ============================================
export { renderEvent } from './renderer/event'

// ============================================
// 类型定义
// ============================================
export type { RenderNode } from './renderer/types'

// ============================================
// Vue API（从 @vue/runtime-core 导出）
// 用户应该从这里导入，确保响应式系统统一
// ============================================
export {
    h,
    ref,
    reactive,
    computed,
    watch,
    watchEffect,
    onMounted,
    onUnmounted
} from '@vue/runtime-core'