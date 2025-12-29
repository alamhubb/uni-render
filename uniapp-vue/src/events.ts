/**
 * 事件系统
 * 
 * 使用 mitt 实现轻量级事件总线
 * 用于小程序事件委托
 */

import mitt from 'mitt'

// 事件类型
type EventHandler = (event: any) => void
type Events = Record<string, EventHandler>

// 创建事件总线
export const eventBus = mitt<Events>()

/**
 * 绑定节点事件
 * 
 * @param nodeId 节点 ID
 * @param eventName 事件名（如 'tap', 'click'）
 * @param handler 事件处理器
 */
export function bindNodeEvent(
    nodeId: number,
    eventName: string,
    handler: EventHandler
): void {
    const key = `${eventName}:${nodeId}`
    eventBus.on(key, handler)
}

/**
 * 触发节点事件
 * 
 * @param nodeId 节点 ID
 * @param eventName 事件名
 * @param event 事件对象
 */
export function triggerNodeEvent(
    nodeId: number,
    eventName: string,
    event: any
): void {
    const key = `${eventName}:${nodeId}`
    eventBus.emit(key, event)
}

/**
 * 解绑节点所有事件
 * 
 * @param nodeId 节点 ID
 */
export function unbindNodeEvents(nodeId: number): void {
    // mitt 的 all 属性包含所有事件
    const all = eventBus.all
    for (const key of all.keys()) {
        if (key.endsWith(`:${nodeId}`)) {
            all.delete(key)
        }
    }
}

/**
 * 创建事件处理器（用于 WXML）
 * 
 * 在页面 JS 中使用：
 * ```javascript
 * Page({
 *   onNodeTap(e) {
 *     const nodeId = e.currentTarget.dataset.id
 *     triggerNodeEvent(nodeId, 'tap', e)
 *   }
 * })
 * ```
 */
export function createEventHandler(eventName: string) {
    return function (e: any) {
        const nodeId = e.currentTarget?.dataset?.id
        if (nodeId !== undefined) {
            triggerNodeEvent(Number(nodeId), eventName, e)
        }
    }
}

/**
 * 创建页面事件处理器
 * 
 * 用于小程序 Page 配置，批量创建事件处理器
 * 
 * 用法：
 * ```javascript
 * Page({
 *   ...createPageHandlers(),
 *   onLoad() { ... }
 * })
 * ```
 */
export function createPageHandlers() {
    return {
        onNodeTap: createEventHandler('tap'),
        onNodeClick: createEventHandler('click'),
        onNodeInput: createEventHandler('input'),
        onNodeChange: createEventHandler('change'),
        onNodeFocus: createEventHandler('focus'),
        onNodeBlur: createEventHandler('blur'),
        onNodeLongpress: createEventHandler('longpress'),
        onNodeTouchstart: createEventHandler('touchstart'),
        onNodeTouchmove: createEventHandler('touchmove'),
        onNodeTouchend: createEventHandler('touchend'),
    }
}
