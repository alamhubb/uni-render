/**
 * 自定义 Vendor 运行时
 * 使用官方 Vue 3 + 自定义函数，替代 uni-app 的魔改 Vue
 * 解决 vOn 函数中 getCurrentInstance() 返回 null 的问题
 */


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
 * 小程序生命周期 - mpOnLaunch
 * 在 H5 环境中直接执行，不依赖 Vue 生命周期
 * 使用不同名字避免与 @dcloudio/uni-app 冲突
 */
export function mpOnLaunch(callback?: Function): void {
  console.log('[MiniApp Lifecycle] mpOnLaunch registered (noop in H5)')
  if (typeof callback === 'function') {
    setTimeout(() => {
      console.log('[MiniApp Lifecycle] mpOnLaunch triggered')
      callback()
    }, 0)
  }
}

// 为了兼容，也导出为 onLaunch
export { mpOnLaunch as onLaunch }

/**
 * 小程序生命周期 - mpOnShow
 */
export function mpOnShow(callback?: Function): void {
  console.log('[MiniApp Lifecycle] mpOnShow registered (noop in H5)')
  if (typeof callback === 'function') {
    setTimeout(() => {
      console.log('[MiniApp Lifecycle] mpOnShow triggered')
      callback()
    }, 0)
  }
}

export { mpOnShow as onShow }

/**
 * 小程序生命周期 - mpOnHide
 */
export function mpOnHide(callback?: Function): void {
  console.log('[MiniApp Lifecycle] mpOnHide registered (noop in H5)')
  // onHide 在 H5 中不执行
}

export { mpOnHide as onHide }

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

  // 生命周期
  onMounted,
  onUnmounted,
  onBeforeMount,
  onBeforeUnmount,
  onUpdated,
  onBeforeUpdate,

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

  // 注意：createApp 从官方 Vue 导出
  // miniapp-runtime 使用标准 DOM 渲染器，不依赖 uni-app-render
  createApp,

  // 类型
  type Ref,
  type ComputedRef,
  type App,
  type VNode,
  type Component
} from 'vue'

// ============================================
// uni-app 兼容 API
// ============================================

// 在 miniapp-runtime 环境中，使用官方 Vue 的 createApp
// 它有标准的 DOM 渲染器，可以直接渲染到浏览器 DOM
import { createApp } from 'vue'
export const createSSRApp = createApp

console.log('[uniapp-vue-adapter] Loaded - using official Vue 3 with standard DOM renderer')
