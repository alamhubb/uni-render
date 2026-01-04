/**
 * 触发事件函数
 *
 * 从全局 eventHandlers 查找并执行事件处理器
 */

import { getEventHandlers } from './useRenderNode'

/**
 * 触发指定节点的事件
 *
 * @param componentId - 组件 ID（由 useVnodeTree 提供）
 * @param eventId - 事件 ID（如 'e0', 'e1'）
 * @param event - 事件对象
 */
export function triggerEvent(componentId: number, eventId: string, event: any): boolean {
    const handlers = getEventHandlers(componentId)

    if (!handlers) {
        console.warn('[triggerEvent] 未找到组件的 eventHandlers, componentId:', componentId)
        return false
    }

    const handler = handlers.get(eventId)

    if (!handler) {
        console.warn(`[triggerEvent] 未找到事件处理器: eventId='${eventId}'`)
        return false
    }

    // 执行处理器
    handler(event)
    return true
}

/**
 * 创建小程序风格的事件对象
 */
export function createMpEvent(nativeEvent: any, eventType: string): any {
    const target = nativeEvent?.target || {}
    const currentTarget = nativeEvent?.currentTarget || {}

    const mpEvent: any = {
        type: eventType,
        timeStamp: nativeEvent?.timeStamp || Date.now(),
        target: {
            id: target.id || '',
            dataset: target.dataset || {},
        },
        currentTarget: {
            id: currentTarget.id || '',
            dataset: currentTarget.dataset || {},
        },
        detail: {},
    }

    // input 事件特殊处理
    if (eventType === 'input' && target.value !== undefined) {
        mpEvent.detail.value = target.value
    }

    return mpEvent
}
