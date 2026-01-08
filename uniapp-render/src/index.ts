/**
 * uniapp-render - 让 UniApp 支持 Vue 渲染函数（h 函数）开发
 *
 * 核心功能：
 * - render: 使用 Custom Renderer 渲染组件
 * - defineRenderComponent: 定义渲染函数组件（自动桥接）
 * - renderEvent: 事件触发（供 RenderComponent 调用）
 *
 * 使用方式：
 * ```vue
 * <script lang="ts">
 * import { defineComponent, ref, h } from 'vue'  // 标准 Vue 写法
 *
 * export default defineComponent({
 *   setup() {
 *     const count = ref(0)
 *     return () => h('view', { onClick: () => count.value++ }, count.value)
 *   }
 * })
 * </script>
 * ```
 * 
 * vite-plugin-uni-render 会自动转换为：
 * - from 'vue' → from 'uniapp-render'
 * - defineComponent → defineRenderComponent
 * - 添加模板 <render-component :node="node" />
 */

// ============================================
// Custom Renderer
// ============================================
export { render } from './renderer/render'
export { defineRenderComponent } from './renderer/defineRenderComponent'

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
    onUnmounted,
    defineComponent
} from '@vue/runtime-core'