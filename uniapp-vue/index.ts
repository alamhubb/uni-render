/**
 * uniapp-vue
 * 
 * 为 uni-app 小程序提供 Vue 3 支持
 * 
 * 功能：
 * 1. 使用自定义渲染器 (Custom Renderer)
 * 2. 渲染到 MPNode 虚拟树 → setData → 小程序原生渲染
 */

// ============================================
// 导出 Vue 所有 API（runtime-dom 包含 runtime-core）
// ============================================
export * from '@vue/runtime-dom'

// ============================================
// 用 Custom Renderer 的 createApp 覆盖 runtime-dom 的
// ============================================
export {
    createApp,
    createApp as createSSRApp,
    forceUpdate,
    getRootNode
} from './src/renderer'

export type { MPNode } from './src/renderer/nodeOps'
export type { SerializedNode } from './src/renderer/serialize'

// ============================================
// 导出事件系统
// ============================================
export {
    eventBus,
    bindNodeEvent,
    triggerNodeEvent,
    createEventHandler,
    createPageHandlers
} from './src/events'

// ============================================
// uni-app 兼容函数
// ============================================

import { getCurrentInstance } from '@vue/runtime-dom'

/**
 * 文本处理函数
 */
export function t(value: any): string {
    return String(value ?? '')
}

/**
 * 事件处理函数
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
 * 错误日志函数
 */
export function logError(err: unknown, type?: string, args?: unknown[]): void {
    console.error(`[uni-app error]${type ? ` ${type}` : ''}:`, err)
}

/**
 * 生命周期钩子
 */
export function onBeforeActivate(callback?: Function): void { }
export function onBeforeDeactivate(callback?: Function): void { }

/**
 * injectHook 实现
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


console.log('[uniapp-vue] 已加载 - Custom Renderer 模式')
