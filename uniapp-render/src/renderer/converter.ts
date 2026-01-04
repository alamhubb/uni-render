/**
 * VNode 转 MPNode 转换器
 *
 * 将 Vue 的 VNode 转换为可序列化的 MPNode 数据结构
 */

import type { VNode } from 'vue'
import type { MPNode } from './serialize'

// ============================================
// 事件名映射
// ============================================
export const EVENT_MAP: Record<string, string> = {
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

/**
 * 转换上下文
 */
export interface ConvertContext {
    eventHandlers: Map<string, Function>
    eventIndex: number
    nodeIdCounter: number
}

/**
 * 创建转换上下文
 */
export function createConvertContext(eventHandlers: Map<string, Function>): ConvertContext {
    return {
        eventHandlers,
        eventIndex: 0,
        nodeIdCounter: 0
    }
}

/**
 * 将 VNode 转换为 MPNode
 */
export function vnodeToMPNode(vnode: VNode, ctx: ConvertContext): MPNode {
    const nodeId = ++ctx.nodeIdCounter

    // 文本子节点
    if (typeof vnode.children === 'string') {
        return {
            id: nodeId,
            type: vnode.type as string,
            props: normalizeProps(vnode.props || {}, ctx),
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
                    id: ++ctx.nodeIdCounter,
                    type: '#text',
                    props: {},
                    text: String(child),
                    children: []
                })
            } else if (typeof child === 'object' && 'type' in child) {
                children.push(vnodeToMPNode(child as VNode, ctx))
            }
        }
    }

    return {
        id: nodeId,
        type: vnode.type as string,
        props: normalizeProps(vnode.props || {}, ctx),
        children
    }
}

/**
 * 规范化 props，处理事件绑定
 */
function normalizeProps(props: Record<string, any>, ctx: ConvertContext): Record<string, any> {
    const normalized: Record<string, any> = {}

    for (const [key, value] of Object.entries(props)) {
        // 处理事件
        if (key.startsWith('on') && typeof value === 'function') {
            const mappedEvent = EVENT_MAP[key]
            const eventName = mappedEvent || key.slice(2).toLowerCase()

            const eventId = `e${ctx.eventIndex++}`
            ctx.eventHandlers.set(eventId, value)
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
