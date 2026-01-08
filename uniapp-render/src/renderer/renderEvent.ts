/**
 * 事件注册模块
 * 
 * 双 Map 架构：
 * 1. eventRegistry: eventId → handler（全局事件表）
 * 2. scopeRegistry: scopeId → Set<eventId>（组件/页面事件表）
 */

// 全局事件注册表：eventId → handler
const renderEvent = new Map<string, Function>()

// 组件/页面事件表：scopeId → Set<eventId>
const scopeRegistry = new Map<string, Set<string>>()

let eventIdCounter = 0
let scopeIdCounter = 0

/**
 * 创建事件作用域（每个 useRender 实例一个）
 * @returns scopeId
 */
export function createEventScope(): string {
    const scopeId = `__scope_${++scopeIdCounter}__`
    scopeRegistry.set(scopeId, new Set())
    return scopeId
}

/**
 * 注册事件处理器（带作用域）
 * @param scopeId 作用域 ID
 * @param handler 事件处理函数
 * @returns 事件 ID
 */
export function registerEvent(handler: Function, scopeId?: string): string {
    const eventId = `__mp_evt_${++eventIdCounter}__`
    renderEvent.set(eventId, handler)

    // 如果提供了作用域，记录到组件事件表
    if (scopeId && scopeRegistry.has(scopeId)) {
        scopeRegistry.get(scopeId)!.add(eventId)
    }

    return eventId
}

/**
 * 触发渲染事件（供 RenderComponent 调用）
 * @param eventId 事件 ID
 * @param event 原始事件对象
 */
export function renderEvent(eventId: string, event?: any): void {
    const handler = renderEvent.get(eventId)
    if (handler) {
        handler(event)
    }
}

/**
 * 清理作用域内的所有事件
 * @param scopeId 作用域 ID
 */
export function clearEventScope(scopeId: string): void {
    const eventIds = scopeRegistry.get(scopeId)
    if (eventIds) {
        // 从全局表中删除该作用域的所有事件
        eventIds.forEach(id => renderEvent.delete(id))
        // 删除作用域记录
        scopeRegistry.delete(scopeId)
    }
}

/**
 * 注销单个事件
 * @param eventId 事件 ID
 */
export function unregisterEvent(eventId: string): void {
    renderEvent.delete(eventId)
}

/**
 * 批量注销事件
 * @param eventIds 事件 ID 数组
 */
export function unregisterEvents(eventIds: string[]): void {
    eventIds.forEach(id => renderEvent.delete(id))
}

/**
 * 清空所有事件（用于重置/测试）
 */
export function clearEvents(): void {
    renderEvent.clear()
    scopeRegistry.clear()
    eventIdCounter = 0
    scopeIdCounter = 0
}
