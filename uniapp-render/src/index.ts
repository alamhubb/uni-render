/**
 * uniapp-render - 让 UniApp 支持 Vue 渲染函数（h 函数）开发
 *
 * 核心功能：
 * - 自动转换无 template 的组件为渲染函数组件
 * - defineRenderComponent: 智能桥接 render 函数到 UniApp
 * - 完全兼容 Vue 3 标准 API
 */

// ============================================
// Vue 标准 API（和 @dcloudio/uni-h5-vue 一致）
// ============================================
export {
    // 核心 API
    h,
    defineComponent,  // Component 级别直接使用

    // 响应式 API
    ref,
    reactive,
    computed,
    readonly,
    shallowRef,
    shallowReactive,
    toRef,
    toRefs,

    // 监听器
    watch,
    watchEffect,

    // 生命周期钩子
    onBeforeMount,
    onMounted,
    onBeforeUpdate,
    onUpdated,
    onBeforeUnmount,
    onUnmounted,

    // 依赖注入
    provide,
    inject,

    // 其他工具
    nextTick,
    getCurrentInstance,

    // Block 相关 (模板编译需要)
    createBlock,
    openBlock,
    createVNode,
    createTextVNode,
    createCommentVNode,
    createElementBlock,
    createElementVNode,
    Fragment,
    Text,
    Comment,

    // 组件解析 (模板编译需要)
    resolveComponent,
    resolveDirective,
    resolveDynamicComponent,

    // 指令相关
    withDirectives,

    // 渲染相关
    renderSlot,
    renderList,
    withCtx,
    mergeProps,
    normalizeClass,
    normalizeStyle,
    normalizeProps,
    guardReactiveProps,
    toHandlers,
    cloneVNode,
    toDisplayString,  // 模板编译需要

    // 响应式工具
    isRef,
    unref,
    toValue,
    isReactive,
    isReadonly,
    isProxy,
    markRaw,
    toRaw,
    triggerRef,
    customRef,
    shallowReadonly,
    effectScope,
    onScopeDispose
} from '@vue/runtime-core'

// ============================================
// 我们覆盖的 API
// ============================================

// 渲染函数组件：和 UniApp 交互，使用 <render-component :node="node" />
export { defineRenderComponent } from './renderer/defineRenderComponent'

// ============================================
// 内部工具（通常不需要用户直接使用）
// ============================================
export { render } from './renderer/render'
export { renderEvent } from './renderer/event'

// ============================================
// 类型定义
// ============================================
export type { RenderNode } from './renderer/types'