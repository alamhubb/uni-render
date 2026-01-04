/**
 * 自定义 h 函数
 *
 * 双层 Map 结构：Map<componentId, Map<eventId, handler>>
 * 使用 getApp().globalData 存储
 */

import { h as vueH, getCurrentInstance } from 'vue'
import type { VNode } from 'vue'

// ============================================
// 全局事件存储
// ============================================

/**
 * 获取全局事件处理器 Map
 * Map<componentId, Map<eventId, Function>>
 */
function getEventHandlersMap(): Map<number, Map<string, Function>> {
    const app = getApp() as any
    if (!app.globalData) {
        app.globalData = {}
    }
    if (!app.globalData.__eventHandlers__) {
        app.globalData.__eventHandlers__ = new Map()
    }
    return app.globalData.__eventHandlers__
}

/**
 * 获取事件计数器 Map
 */
function getEventCountersMap(): Map<number, number> {
    const app = getApp() as any
    if (!app.globalData.__eventCounters__) {
        app.globalData.__eventCounters__ = new Map()
    }
    return app.globalData.__eventCounters__
}

/**
 * 获取或创建组件的事件 Map
 */
function getComponentEventMap(componentId: number): Map<string, Function> {
    const map = getEventHandlersMap()
    let componentMap = map.get(componentId)
    if (!componentMap) {
        componentMap = new Map()
        map.set(componentId, componentMap)
    }
    return componentMap
}

/**
 * 获取并递增事件计数器
 */
function getNextEventId(componentId: number): string {
    const counters = getEventCountersMap()
    const current = counters.get(componentId) || 0
    counters.set(componentId, current + 1)
    return `e${current}`
}

// ============================================
// 事件名映射
// ============================================
const EVENT_MAP: Record<string, string> = {
    'onClick': 'tap',
    'onTap': 'tap',
    'onInput': 'input',
    'onChange': 'change',
    'onFocus': 'focus',
    'onBlur': 'blur',
    'onSubmit': 'submit',
    'onScroll': 'scroll',
    'onLongpress': 'longpress',
}

// ============================================
// 自定义 h 函数
// ============================================

/**
 * 自定义 h 函数
 *
 * - 保留原始 onClick（UniApp 处理兼容）
 * - 添加 bindtap（小程序使用）
 * - 存储到 getApp().globalData
 */
export function h(type: any, propsOrChildren?: any, children?: any): VNode {
    const instance = getCurrentInstance()
    if (!instance || instance.uid === undefined) {
        throw new Error('[uniapp-render] h() 必须在 setup() 或渲染函数中调用')
    }
    const componentId = instance.uid

    // 处理参数
    let props: Record<string, any> | null = null
    let childrenArg: any = children

    if (propsOrChildren !== undefined) {
        if (typeof propsOrChildren === 'object' && !Array.isArray(propsOrChildren) &&
            propsOrChildren !== null && !propsOrChildren.__v_isVNode) {
            props = propsOrChildren
        } else {
            childrenArg = propsOrChildren
        }
    }

    // 处理事件
    if (props) {
        const processed: Record<string, any> = {}
        const eventMap = getComponentEventMap(componentId)

        for (const [key, value] of Object.entries(props)) {
            if (key in EVENT_MAP && typeof value === 'function') {
                const eventName = EVENT_MAP[key]
                const eventId = getNextEventId(componentId)

                // 直接存储函数
                eventMap.set(eventId, value)

                // 保留原始事件 + 添加 bindtap
                processed[key] = value
                processed[`bind${eventName}`] = eventId
            } else {
                processed[key] = value
            }
        }
        props = processed
    }

    // 调用原始 h 函数
    if (props !== null && childrenArg !== undefined) {
        return vueH(type, props, childrenArg)
    } else if (props !== null) {
        return vueH(type, props)
    } else if (childrenArg !== undefined) {
        return vueH(type, childrenArg)
    }
    return vueH(type)
}

// ============================================
// 辅助函数
// ============================================

/**
 * 获取组件的事件 Map
 */
export function getEventHandlers(componentId: number): Map<string, Function> | null {
    return getEventHandlersMap().get(componentId) || null
}

/**
 * 清理组件的事件
 */
export function cleanupEventHandlers(componentId: number): void {
    getEventHandlersMap().delete(componentId)
    getEventCountersMap().delete(componentId)
}

// 版本信息
const VERSION = '5.0.0'
console.log(`[uniapp-render] v${VERSION} - getApp().globalData 模式`)