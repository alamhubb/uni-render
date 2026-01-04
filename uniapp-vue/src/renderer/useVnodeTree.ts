/**
 * useVnodeTree - 将渲染函数转换为响应式的 vnodeTree 数据
 *
 * 【架构说明 - 真机小程序双线程】
 * - 逻辑层：事件处理函数存储在 eventHandlers 里（不能被序列化）
 * - 渲染层：vnodeTree 只包含事件 ID 字符串（可序列化通过 setData 传递）
 * - 事件触发：渲染层触发 → 通过事件 ID 查找 → 调用逻辑层的处理函数
 */

import { ref, watchEffect, getCurrentInstance, provide, onUnmounted } from 'vue'
import type { VNode } from 'vue'
import type { MPNode } from './serialize'

/**
 * Invoker 接口 - 模仿 UniApp 的事件处理机制
 */
interface Invoker {
    (e: any): void
    value: Function
}

/**
 * 获取小程序全局 eventHandlers 存储
 * 使用 getApp().globalData 存储，符合小程序官方规范
 */
function getGlobalEventHandlers(): Map<number, Record<string, Invoker>> {
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
 * 将渲染函数转换为响应式的 vnodeTree
 */
export function useVnodeTree(renderFn: () => any) {
    console.log('🚀 [useVnodeTree] VERSION 4.2 - getApp().globalData 模式 🚀')

    const instance = getCurrentInstance()
    const pageId = instance?.uid ?? 0
    console.log('[useVnodeTree] 页面ID:', pageId)

    const vnodeTree = ref<MPNode | null>(null)
    const eventHandlers: Record<string, Invoker> = {}

    // 📌 存储到 getApp().globalData
    const globalHandlers = getGlobalEventHandlers()
    globalHandlers.set(pageId, eventHandlers)
    console.log('[useVnodeTree] 已存储到 globalData, 当前页面数:', globalHandlers.size)

    provide('__pageId__', pageId)

    let eventIndex = 0
    let nodeIdCounter = 0

    watchEffect(() => {
        eventIndex = 0
        nodeIdCounter = 0

        const vnode = renderFn()
        if (vnode) {
            vnodeTree.value = vnodeToMPNode(vnode)
        } else {
            vnodeTree.value = null
        }
    })

    onUnmounted(() => {
        getGlobalEventHandlers().delete(pageId)
        console.log('[useVnodeTree] 清理页面:', pageId)
    })

    function vnodeToMPNode(vnode: VNode): MPNode {
        const nodeId = ++nodeIdCounter

        if (typeof vnode.children === 'string') {
            return {
                id: nodeId,
                type: vnode.type as string,
                props: normalizeProps(vnode.props || {}),
                text: vnode.children,
                children: []
            }
        }

        if (typeof vnode === 'string' || typeof vnode === 'number') {
            return {
                id: nodeId,
                type: '#text',
                props: {},
                text: String(vnode),
                children: []
            }
        }

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
            if (key.startsWith('on') && typeof value === 'function') {
                let eventName = key.slice(2).toLowerCase()
                if (eventName === 'click') eventName = 'tap'

                const eventId = `e${eventIndex++}`
                if (eventHandlers[eventId]) {
                    eventHandlers[eventId].value = value
                } else {
                    const invoker: Invoker = ((e: any) => invoker.value(e)) as Invoker
                    invoker.value = value
                    eventHandlers[eventId] = invoker
                }
                normalized[`bind${eventName}`] = eventId
            } else if (key === 'class') {
                normalized[key] = Array.isArray(value) ? value.join(' ') : value
            } else if (key === 'style' && typeof value === 'object') {
                normalized[key] = Object.entries(value).map(([k, v]) => `${k}: ${v}`).join(';')
            } else {
                normalized[key] = value
            }
        }
        return normalized
    }

    return { vnodeTree, eventHandlers }
}

/**
 * 获取指定页面的 eventHandlers
 */
export function getPageEventHandlers(pageId: number): Record<string, Invoker> | null {
    const globalHandlers = getGlobalEventHandlers()
    return globalHandlers.get(pageId) || null
}

/**
 * 在小程序页面实例上设置事件代理
 */
export function setupPageEventProxy(
    pageInstance: any,
    eventHandlers: Record<string, any>,
    maxEvents: number = 100
): void {
    pageInstance._eventHandlers = eventHandlers
    for (let i = 0; i < maxEvents; i++) {
        const eventId = `e${i}`
        pageInstance[eventId] = function (e: any) {
            if (pageInstance._eventHandlers?.[eventId]) {
                return pageInstance._eventHandlers[eventId](e)
            }
        }
    }
}
