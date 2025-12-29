/**
 * uniapp-vue
 * 
 * 为 uni-app 小程序提供 Vue 3 渲染函数（h 函数）支持
 * 
 * 极简设计：直接使用 Vue 标准渲染器，不需要自定义渲染器
 * WXML 编译成 h() → Vue 标准渲染 → 浏览器 DOM
 */

// ============================================
// 直接导出 Vue 标准 API
// ============================================
export * from '@vue/runtime-dom'

// ============================================
// 额外的适配函数（兼容 uni-app）
// ============================================

import { getCurrentInstance } from '@vue/runtime-dom'

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
 */
export function o(handler: Function): Function {
    return handler
}

/**
 * 小程序生命周期 - onLaunch
 */
export function onLaunch(callback?: Function): void {
    console.log('[uniapp-vue] onLaunch registered')
    if (typeof callback === 'function') {
        setTimeout(() => callback(), 0)
    }
}

/**
 * 小程序生命周期 - onShow
 */
export function onShow(callback?: Function): void {
    console.log('[uniapp-vue] onShow registered')
    if (typeof callback === 'function') {
        setTimeout(() => callback(), 0)
    }
}

/**
 * 小程序生命周期 - onHide
 */
export function onHide(callback?: Function): void {
    console.log('[uniapp-vue] onHide registered')
}

/**
 * uni-app 自定义的错误日志函数
 */
export function logError(err: unknown, type?: string, args?: unknown[]): void {
    console.error(`[uni-app error]${type ? ` ${type}` : ''}:`, err)
}

/**
 * uni-app 自定义的生命周期钩子
 */
export function onBeforeActivate(callback?: Function): void { }
export function onBeforeDeactivate(callback?: Function): void { }

/**
 * injectHook 实现（Vue 3.5+ 不再导出）
 */
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

console.log('[uniapp-vue] Loaded - 直接使用 Vue 标准渲染器')
