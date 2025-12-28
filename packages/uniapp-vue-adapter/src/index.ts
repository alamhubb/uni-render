/**
 * uniapp-vue-adapter
 * 
 * Vue 3 适配层，为 uni-app 小程序提供：
 * 1. 官方 Vue 3 的所有 API
 * 2. uni-app 特有的适配函数（o, t, 生命周期钩子）
 * 
 * 注意：不包含渲染器，createApp 由 uniapp-vue-render 提供
 */

// ============================================
// 导出官方 Vue 3 API
// ============================================
export {
  // 核心 API
  defineComponent,
  ref,
  computed,
  reactive,
  readonly,
  toRef,
  toRefs,
  isRef,
  unref,
  shallowRef,
  triggerRef,
  customRef,

  // 生命周期
  onMounted,
  onUnmounted,
  onBeforeMount,
  onBeforeUnmount,
  onUpdated,
  onBeforeUpdate,
  onActivated,
  onDeactivated,
  onErrorCaptured,
  onRenderTracked,
  onRenderTriggered,

  // Watch API
  watch,
  watchEffect,
  watchPostEffect,
  watchSyncEffect,

  // 工具函数
  nextTick,
  getCurrentInstance,

  // 组件 API
  provide,
  inject,

  // 渲染函数
  h,
  createVNode,
  cloneVNode,
  mergeProps,
  isVNode,

  // 类型
  type Ref,
  type ComputedRef,
  type App,
  type VNode,
  type Component,
  type ComponentPublicInstance,
  type PropType
} from 'vue'

// ============================================
// uni-app 适配函数
// ============================================

/**
 * 文本处理函数
 * uni-app 的 t() 函数用于处理文本插值
 */
export function t(value: any): string {
  return String(value ?? '')
}

/**
 * 事件处理函数
 * 替代 uni-app 的 vOn，直接返回处理器函数
 * 不需要 getCurrentInstance()，完美解决实例问题！
 */
export function o(handler: Function): Function {
  return handler
}

/**
 * 小程序生命周期 - onLaunch
 */
export function onLaunch(callback?: Function): void {
  console.log('[uniapp-vue-adapter] onLaunch registered (noop in browser)')
  if (typeof callback === 'function') {
    setTimeout(() => {
      console.log('[uniapp-vue-adapter] onLaunch triggered')
      callback()
    }, 0)
  }
}

/**
 * 小程序生命周期 - onShow
 */
export function onShow(callback?: Function): void {
  console.log('[uniapp-vue-adapter] onShow registered (noop in browser)')
  if (typeof callback === 'function') {
    setTimeout(() => {
      console.log('[uniapp-vue-adapter] onShow triggered')
      callback()
    }, 0)
  }
}

/**
 * 小程序生命周期 - onHide
 */
export function onHide(callback?: Function): void {
  console.log('[uniapp-vue-adapter] onHide registered (noop in browser)')
  // onHide 在浏览器中不执行
}

console.log('[uniapp-vue-adapter] Loaded - providing official Vue 3 API + adapter functions')
