/**
 * useVnodeTree - 将渲染函数转换为响应式的 vnodeTree 数据
 * 
 * 用于小程序环境，将 h() 函数输出转换为可被 render.wxml 渲染的数据结构
 */

import { ref, watchEffect, Ref } from 'vue'
import type { VNode } from 'vue'
import type { MPNode } from './serialize'

/**
 * 将渲染函数转换为响应式的 vnodeTree
 * 
 * @param renderFn - 返回 VNode 的渲染函数
 * @returns 响应式的 vnodeTree ref
 * 
 * @example
 * ```ts
 * const vnodeTree = useVnodeTree(() => h('view', { class: 'box' }, 'Hello'))
 * // vnodeTree.value = { type: 'view', props: { class: 'box' }, children: [...] }
 * ```
 */
export function useVnodeTree(renderFn: () => any): Ref<MPNode | null> {
    const vnodeTree = ref<MPNode | null>(null)

    watchEffect(() => {
        const vnode = renderFn()
        if (vnode) {
            vnodeTree.value = vnodeToMPNode(vnode)
        } else {
            vnodeTree.value = null
        }
    })

    return vnodeTree
}

let nodeIdCounter = 0

/**
 * 将 Vue VNode 转换为 MPNode
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
    } else if (vnode.children && typeof vnode.children === 'object') {
        // 处理单个子节点（可能是 VNode 或其他类型）
        const child = vnode.children as unknown
        if (child && typeof child === 'object' && 'type' in child) {
            children.push(vnodeToMPNode(child as VNode))
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
 * 规范化 props，移除事件处理器（事件通过 data-id + 事件委托处理）
 */
function normalizeProps(props: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {}

    for (const key in props) {
        // 跳过事件处理器（以 on 开头）
        if (key.startsWith('on') && typeof props[key] === 'function') {
            continue
        }

        result[key] = props[key]
    }

    return result
}

/**
 * 事件处理器存储
 * key: `${eventName}:${nodeId}`
 * value: 处理函数
 */
const eventHandlers = new Map<string, Function>()

/**
 * 绑定节点事件（在 vnodeToMPNode 时调用）
 */
export function bindEvent(nodeId: number, eventName: string, handler: Function): void {
    const key = `${eventName}:${nodeId}`
    eventHandlers.set(key, handler)
}

/**
 * 触发节点事件（在小程序页面的事件处理器中调用）
 */
export function triggerEvent(nodeId: number, eventName: string, event: any): void {
    const key = `${eventName}:${nodeId}`
    const handler = eventHandlers.get(key)
    if (handler) {
        handler(event)
    }
}

/**
 * 创建页面事件处理器
 * 
 * @example
 * ```ts
 * Page({
 *   ...createPageEventHandlers(),
 *   onLoad() { ... }
 * })
 * ```
 */
export function createPageEventHandlers() {
    return {
        onNodeTap(e: any) {
            const nodeId = e.currentTarget?.dataset?.id
            if (nodeId) {
                triggerEvent(Number(nodeId), 'tap', e)
            }
        },
        onNodeInput(e: any) {
            const nodeId = e.currentTarget?.dataset?.id
            if (nodeId) {
                triggerEvent(Number(nodeId), 'input', e)
            }
        },
        onNodeFocus(e: any) {
            const nodeId = e.currentTarget?.dataset?.id
            if (nodeId) {
                triggerEvent(Number(nodeId), 'focus', e)
            }
        },
        onNodeBlur(e: any) {
            const nodeId = e.currentTarget?.dataset?.id
            if (nodeId) {
                triggerEvent(Number(nodeId), 'blur', e)
            }
        }
    }
}
