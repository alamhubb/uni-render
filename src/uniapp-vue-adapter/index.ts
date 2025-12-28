/**
 * 自定义 Vendor 运行时
 * 使用官方 Vue 3 + 自定义函数，替代 uni-app 的魔改 Vue
 * 解决 vOn 函数中 getCurrentInstance() 返回 null 的问题
 */

import {
  defineComponent,
  ref,
  computed,
  createApp
} from 'vue'

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

// 导出官方 Vue API
export {
  defineComponent,
  ref,
  computed,
  createApp
}

// 使用 createApp 作为 createSSRApp（在 H5 环境中它们是一样的）
export const createSSRApp = createApp

console.log('[Custom Vendor] Loaded - using official Vue 3 runtime')
