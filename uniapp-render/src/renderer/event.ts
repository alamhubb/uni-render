/**
 * 事件注册模块
 * 
 * 双 Map 架构：
 * 1. eventRegistry: eventId → handler（全局事件表）
 * 2. scopeRegistry: scopeId → Set<eventId>（组件/页面事件表）
 * 
 * 使用全局对象确保单例，避免模块重复打包导致的事件丢失
 * - H5: 使用 window
 * - 小程序: 使用 getApp().globalData
 */

// 扩展全局类型
declare global {
    interface Window {
        __uniapp_render__?: {
            eventRegistry: Map<string, Function>
            scopeRegistry: Map<string, Set<string>>
            eventCounter: number
            scopeCounter: number
        }
    }
}

// 获取全局存储
function getGlobalStorage() {
    // H5 环境
    if (typeof window !== 'undefined') {
        if (!window.__uniapp_render__) {
            window.__uniapp_render__ = {
                eventRegistry: new Map<string, Function>(),
                scopeRegistry: new Map<string, Set<string>>(),
                eventCounter: 0,
                scopeCounter: 0
            }
        }
        return window.__uniapp_render__
    }

    // 小程序环境
    try {
        const app = getApp()
        if (app && app.globalData) {
            if (!app.globalData.__uniapp_render__) {
                app.globalData.__uniapp_render__ = {
                    eventRegistry: new Map<string, Function>(),
                    scopeRegistry: new Map<string, Set<string>>(),
                    eventCounter: 0,
                    scopeCounter: 0
                }
            }
            return app.globalData.__uniapp_render__
        }
    } catch (e) {
        // getApp() 可能失败
    }

    // 降级：模块级存储（可能有多实例问题）
    return _fallback
}

// 降级存储
const _fallback = {
    eventRegistry: new Map<string, Function>(),
    scopeRegistry: new Map<string, Set<string>>(),
    eventCounter: 0,
    scopeCounter: 0
}

/**
 * 创建事件作用域（每个 useRender 实例一个）
 * @returns scopeId
 */
export function createEventScope(): string {
    const storage = getGlobalStorage()
    storage.scopeCounter++
    const scopeId = `__scope_${storage.scopeCounter}__`
    storage.scopeRegistry.set(scopeId, new Set())
    return scopeId
}

/**
 * 注册事件处理器（带作用域）
 * @param handler 事件处理函数
 * @param scopeId 作用域 ID
 * @returns 事件 ID
 */
export function registerEvent(handler: Function, scopeId?: string): string {
    const storage = getGlobalStorage()
    storage.eventCounter++
    const eventId = `__mp_evt_${storage.eventCounter}__`
    storage.eventRegistry.set(eventId, handler)

    // 如果提供了作用域，记录到组件事件表
    if (scopeId && storage.scopeRegistry.has(scopeId)) {
        storage.scopeRegistry.get(scopeId)!.add(eventId)
    }

    return eventId
}

/**
 * 触发渲染事件（供 RenderComponent 调用）
 * @param eventId 事件 ID
 * @param event 原始事件对象
 */
export function renderEvent(eventId: string, event?: any): void {
    const storage = getGlobalStorage()
    const handler = storage.eventRegistry.get(eventId)
    if (handler) {
        handler(event)
    }
}

/**
 * 清理作用域内的所有事件
 * @param scopeId 作用域 ID
 */
export function clearEventScope(scopeId: string): void {
    const storage = getGlobalStorage()
    const eventIds = storage.scopeRegistry.get(scopeId)
    if (eventIds) {
        // 从全局表中删除该作用域的所有事件
        eventIds.forEach(id => storage.eventRegistry.delete(id))
        // 删除作用域记录
        storage.scopeRegistry.delete(scopeId)
    }
}

/**
 * 注销单个事件
 * @param eventId 事件 ID
 */
export function unregisterEvent(eventId: string): void {
    getGlobalStorage().eventRegistry.delete(eventId)
}

/**
 * 批量注销事件
 * @param eventIds 事件 ID 数组
 */
export function unregisterEvents(eventIds: string[]): void {
    const storage = getGlobalStorage()
    eventIds.forEach(id => storage.eventRegistry.delete(id))
}

/**
 * 清空所有事件（用于重置/测试）
 */
export function clearEvents(): void {
    const storage = getGlobalStorage()
    storage.eventRegistry.clear()
    storage.scopeRegistry.clear()
    storage.eventCounter = 0
    storage.scopeCounter = 0
}
