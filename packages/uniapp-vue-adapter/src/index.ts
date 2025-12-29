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
// 导出官方 Vue 3 所有 API
// 注意：从 @vue/runtime-dom 导入，避免 Vite alias 循环依赖
// ============================================
export * from '@vue/runtime-dom'

// ============================================
// Vue 内部 API（uni-app 需要）
// ============================================
// injectHook 在 Vue 3.5+ 中不再导出，我们自己实现
import { getCurrentInstance } from '@vue/runtime-dom'

type LifecycleHook<T = Function> = T[] | null

export function injectHook(
  type: string,
  hook: Function,
  target: any = getCurrentInstance(),
  prepend = false
) {
  if (target) {
    const hooks = target[type] || (target[type] = [])
    if (prepend) {
      hooks.unshift(hook)
    } else {
      hooks.push(hook)
    }
    return hook
  }
}

/**
 * uni-app 自定义的错误日志函数
 * 不是 Vue 官方 API
 */
export function logError(err: unknown, type?: string, args?: unknown[]): void {
  console.error(`[uni-app error]${type ? ` ${type}` : ''}:`, err)
  if (args && args.length) {
    console.error('Arguments:', args)
  }
}

/**
 * uni-app 自定义的生命周期钩子（不是 Vue 官方 API）
 */
export function onBeforeActivate(callback?: Function): void { }
export function onBeforeDeactivate(callback?: Function): void { }

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
