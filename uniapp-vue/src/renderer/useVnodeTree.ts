/**
 * useVnodeTree - 将渲染函数转换为响应式的 vnodeTree 数据
 * 
 * 【架构说明 - 真机小程序双线程】
 * - 逻辑层：事件处理函数存储在 eventHandlers 里（不能被序列化）
 * - 渲染层：vnodeTree 只包含事件 ID 字符串（可序列化通过 setData 传递）
 * - 事件触发：渲染层触发 → 通过事件 ID 查找 → 调用逻辑层的处理函数
 */

import { ref, watchEffect, getCurrentInstance, provide, onUnmounted } from 'vue'
import type { Ref, VNode } from 'vue'
import type { MPNode } from './serialize'

// 🌐 全局 Map：存储所有页面/组件的 eventHandlers
// key: 组件实例的 uid (number)
// value: 该组件的事件处理器映射
const pageEventHandlers = new Map<number, Record<string, Invoker>>()


/**
 * Invoker 接口 - 模仿 UniApp 的事件处理机制
 * invoker 本身是函数，但有个 value 属性存储真正的处理函数
 * 这样更新事件时只需要更新 value，invoker 本身不变
 */
interface Invoker {
    (e: any): void
    value: Function
}

/**
 * 将渲染函数转换为响应式的 vnodeTree
 * 
 * @param renderFn - 返回 VNode 的渲染函数
 * @returns { vnodeTree, eventHandlers } - vnodeTree 用于传给渲染层，eventHandlers 存在逻辑层
 * 
 * @example
 * ```ts
 * const { vnodeTree, eventHandlers } = useVnodeTree(() => 
 *     h('button', { onClick: () => count.value++ }, '点击')
 * )
 * // vnodeTree.value = { type: 'button', props: { bindtap: 'e0' }, text: '点击' }
 * // eventHandlers = { e0: invoker }
 * ```
 */
export function useVnodeTree(renderFn: () => any) {
    console.log('🚀 [useVnodeTree] VERSION 4.0 - 全局Map模式 - 2026-01-04 21:50 🚀')

    // 获取当前组件实例的唯一 ID
    const instance = getCurrentInstance()
    const pageId = instance?.uid ?? 0
    console.log('[useVnodeTree] 页面ID:', pageId)

    const vnodeTree = ref<MPNode | null>(null)

    // 事件处理器映射表（存在逻辑层，不通过 setData 传递）
    const eventHandlers: Record<string, Invoker> = {}

    // 📌 存储到全局 Map
    pageEventHandlers.set(pageId, eventHandlers)
    console.log('[useVnodeTree] 已存储到全局 Map, 当前页面数:', pageEventHandlers.size)

    // 🔑 自动 provide pageId，让 RenderNode 可以获取
    provide('__pageId__', pageId)

    // 事件 ID 计数器（每次渲染重置）
    let eventIndex = 0

    // 节点 ID 计数器
    let nodeIdCounter = 0

    watchEffect(() => {
        console.log('[useVnodeTree] watchEffect 执行')

        // 每次渲染重置计数器
        eventIndex = 0
        nodeIdCounter = 0

        const vnode = renderFn()
        console.log('[useVnodeTree] vnode:', vnode)

        if (vnode) {
            vnodeTree.value = vnodeToMPNode(vnode)
            console.log('[useVnodeTree] vnodeTree 已更新，事件数量:', Object.keys(eventHandlers).length)
        } else {
            vnodeTree.value = null
        }
    })

    // 🧹 组件销毁时清理全局 Map
    onUnmounted(() => {
        pageEventHandlers.delete(pageId)
        console.log('[useVnodeTree] 清理页面 eventHandlers:', pageId, '剩余页面数:', pageEventHandlers.size)
    })


    /**
     * 将 Vue VNode 转换为 MPNode（内部函数）
     * 递归处理 VNode 树，提取事件处理函数到 eventHandlers
     */
    function vnodeToMPNode(vnode: VNode): MPNode {
        const nodeId = ++nodeIdCounter

        // 文本节点
        if (typeof vnode.children === 'string') {
            return {
                id: nodeId,
                type: vnode.type as string,
                props: normalizeProps(vnode.props || {}),
                text: vnode.children,
                children: []
            }
        }

        // 纯文本
        if (typeof vnode === 'string' || typeof vnode === 'number') {
            return {
                id: nodeId,
                type: '#text',
                props: {},
                text: String(vnode),
                children: []
            }
        }

        // 元素节点
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

    /**
     * 规范化 props（内部函数）
     * 提取事件处理函数到 eventHandlers，props 中只保留事件 ID
     */
    function normalizeProps(props: Record<string, any>): Record<string, any> {
        const normalized: Record<string, any> = {}

        for (const [key, value] of Object.entries(props)) {
            // 处理事件（onClick, onTap 等）
            if (key.startsWith('on') && typeof value === 'function') {
                // 转换事件名: onClick -> tap
                let eventName = key.slice(2).toLowerCase()
                if (eventName === 'click') {
                    eventName = 'tap'
                }

                // 生成事件 ID
                const eventId = `e${eventIndex++}`

                // Invoker 模式：检查是否已存在
                if (eventHandlers[eventId]) {
                    // patch: 只更新 value
                    eventHandlers[eventId].value = value
                } else {
                    // add: 创建新的 invoker
                    const invoker: Invoker = ((e: any) => {
                        return invoker.value(e)
                    }) as Invoker
                    invoker.value = value
                    eventHandlers[eventId] = invoker
                }

                // props 中只存事件 ID（可序列化）
                normalized[`bind${eventName}`] = eventId
            } else if (key === 'class') {
                // class 可能是字符串或数组
                if (Array.isArray(value)) {
                    normalized[key] = value.join(' ')
                } else {
                    normalized[key] = value
                }
            } else if (key === 'style') {
                // style 可能是对象或字符串
                if (typeof value === 'object') {
                    normalized[key] = Object.entries(value)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(';')
                } else {
                    normalized[key] = value
                }
            } else {
                normalized[key] = value
            }
        }


        return normalized
    }


    // 返回 vnodeTree 和 eventHandlers
    return { vnodeTree, eventHandlers }
}

/**
 * 在小程序页面/组件实例上设置事件代理
 * 
 * 用于真机小程序环境，将 eventHandlers 的方法桥接到 Page/Component 实例上
 * 
 * @param pageInstance - 小程序页面或组件实例（通常是 this）
 * @param eventHandlers - useVnodeTree 返回的 eventHandlers 对象
 * @param maxEvents - 最大事件数量，默认 100
 * 
 * @example
 * ```ts
 * Page({
 *   onLoad() {
 *     const { vnodeTree, eventHandlers } = useVnodeTree(() => ...)
 *     setupPageEventProxy(this, eventHandlers)
 *     // 现在小程序可以调用 this.e0, this.e1 等方法
 *   }
 * })
 * ```
 */
export function setupPageEventProxy(
    pageInstance: any,
    eventHandlers: Record<string, any>,
    maxEvents: number = 100
): void {
    console.log('[setupPageEventProxy] 设置事件代理，最大事件数:', maxEvents)

    // 保存 eventHandlers 引用到页面实例
    pageInstance._eventHandlers = eventHandlers

    // 为所有可能的事件 ID 创建代理方法
    for (let i = 0; i < maxEvents; i++) {
        const eventId = `e${i}`

        // 在页面实例上创建代理方法
        pageInstance[eventId] = function (e: any) {
            console.log(`[EventProxy] 调用 ${eventId}`)

            if (pageInstance._eventHandlers && pageInstance._eventHandlers[eventId]) {
                console.log(`[EventProxy] 找到处理器 ${eventId}，执行中...`)
                return pageInstance._eventHandlers[eventId](e)
            } else {
                console.warn(`[EventProxy] 未找到处理器 ${eventId}`)
            }
        }
    }

    console.log('[setupPageEventProxy] 事件代理设置完成')
}

/**
 * 获取指定页面/组件的 eventHandlers
 * 
 * @param pageId - 页面/组件的唯一 ID (Vue 实例的 uid)
 * @returns 该页面的 eventHandlers 对象，如果不存在则返回 null
 */
export function getPageEventHandlers(pageId: number): Record<string, Invoker> | null {
    return pageEventHandlers.get(pageId) || null
}
