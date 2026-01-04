/**
 * useVnodeTree - 将渲染函数转换为响应式的 vnodeTree 数据
 *
 * 【架构说明 - 真机小程序双线程】
 * - 逻辑层：事件处理函数存储在 eventHandlers 里（不能被序列化）
 * - 渲染层：vnodeTree 只包含事件 ID 字符串（可序列化通过 setData 传递）
 * - 事件触发：渲染层触发 → 通过事件 ID 查找 → 调用逻辑层的处理函数
 *
 * 【数据结构】
 * 双层 Map: Map<componentId, Map<eventId, Function>>
 */

import { ref, watchEffect, getCurrentInstance, provide, onUnmounted } from 'vue'
import type { VNode } from 'vue'
import type { MPNode } from './serialize'

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
// 全局事件存储 - 双层 Map
// ============================================

// 小程序运行时全局函数声明
declare function getApp(): any

/**
 * 获取全局事件处理器存储
 * 双层 Map: Map<componentId, Map<eventId, Function>>
 */
function getGlobalEventHandlers(): Map<number, Map<string, Function>> {
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
 * 获取或创建组件的事件 Map
 */
export function getComponentEventMap(componentId: number): Map<string, Function> {
    const globalMap = getGlobalEventHandlers()
    let componentMap = globalMap.get(componentId)
    if (!componentMap) {
        componentMap = new Map()
        globalMap.set(componentId, componentMap)
    }
    return componentMap
}

// ============================================
// 核心函数
// ============================================

/**
 * 将渲染函数转换为响应式的 vnodeTree
 */
export function useVnodeTree(renderFn: () => any) {
    const instance = getCurrentInstance()
    const componentId = instance?.uid ?? 0

    const vnodeTree = ref<MPNode | null>(null)
    const eventHandlers = getComponentEventMap(componentId)

    provide('__componentId__', componentId)

    let eventIndex = 0
    let nodeIdCounter = 0

    watchEffect(() => {
        // 每次渲染前重置计数器
        eventIndex = 0
        nodeIdCounter = 0

        // 清空旧事件（避免残留）
        eventHandlers.clear()

        const vnode = renderFn()
        if (vnode) {
            vnodeTree.value = vnodeToMPNode(vnode)
        } else {
            vnodeTree.value = null
        }
    })

    onUnmounted(() => {
        // 清理组件的所有事件
        getGlobalEventHandlers().delete(componentId)
    })

    function vnodeToMPNode(vnode: VNode): MPNode {
        const nodeId = ++nodeIdCounter

        // 文本子节点
        if (typeof vnode.children === 'string') {
            return {
                id: nodeId,
                type: vnode.type as string,
                props: normalizeProps(vnode.props || {}),
                text: vnode.children,
                children: []
            }
        }

        // 纯文本/数字
        if (typeof vnode === 'string' || typeof vnode === 'number') {
            return {
                id: nodeId,
                type: '#text',
                props: {},
                text: String(vnode),
                children: []
            }
        }

        // 处理子节点
        const children: MPNode[] = []
        if (Array.isArray(vnode.children)) {
            for (const child of vnode.children) {
                if (child == null) continue
                if (typeof child === 'string' || typeof child === 'number') {
                    children.push({
                        id: ++nodeIdCounter,
                        type: '#text',
                        props: {},
                        text: String(child),
                        children: []
                    })
                } else if (typeof child === 'object' && 'type' in child) {
                    children.push(vnodeToMPNode(child as VNode))
                }
            }
        }

        return {
            id: nodeId,
            type: vnode.type as string,
            props: normalizeProps(vnode.props || {}),
            children
        }
    }

    function normalizeProps(props: Record<string, any>): Record<string, any> {
        const normalized: Record<string, any> = {}

        for (const [key, value] of Object.entries(props)) {
            // 处理事件
            if (key.startsWith('on') && typeof value === 'function') {
                // 查找事件名映射
                const mappedEvent = EVENT_MAP[key]
                const eventName = mappedEvent || key.slice(2).toLowerCase()

                const eventId = `e${eventIndex++}`
                eventHandlers.set(eventId, value)  // 直接存储函数
                normalized[`bind${eventName}`] = eventId
            }
            // 处理 class
            else if (key === 'class') {
                normalized[key] = Array.isArray(value) ? value.join(' ') : value
            }
            // 处理 style
            else if (key === 'style' && typeof value === 'object') {
                normalized[key] = Object.entries(value)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join('; ')
            }
            // 其他属性
            else {
                normalized[key] = value
            }
        }
        return normalized
    }

    return { vnodeTree, eventHandlers }
}

// ============================================
// 导出的辅助函数
// ============================================

/**
 * 获取指定组件的事件 Map
 */
export function getEventHandlers(componentId: number): Map<string, Function> | null {
    return getGlobalEventHandlers().get(componentId) || null
}

/**
 * 清理指定组件的事件
 */
export function cleanupEventHandlers(componentId: number): void {
    getGlobalEventHandlers().delete(componentId)
}

/**
 * 在小程序组件实例上设置事件代理
 */
export function setupEventProxy(
    instance: any,
    eventHandlers: Map<string, Function>,
    maxEvents: number = 100
): void {
    instance._eventHandlers = eventHandlers
    for (let i = 0; i < maxEvents; i++) {
        const eventId = `e${i}`
        instance[eventId] = function (e: any) {
            const handler = instance._eventHandlers?.get(eventId)
            if (handler) {
                return handler(e)
            }
        }
    }
}
