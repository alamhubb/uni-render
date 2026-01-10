/**
 * Vue Custom Renderer for RenderNode
 * 
 * 两层架构：
 * 1. InternalNode - Custom Renderer 内部使用，维护父子关系
 * 2. RenderNode - 纯 JSON 输出，给 RenderComponent 渲染
 */

import {
    createRenderer,
    reactive,
    type RendererOptions
} from '@vue/runtime-core'
import type { RenderNode } from './types'
import { registerEvent } from './event'

// ============================================
// 内部节点类型（Custom Renderer 使用）
// ============================================
export interface InternalNode {
    id: number
    type: string
    props: Record<string, any>
    text?: string
    children: InternalNode[]
    _parent?: InternalNode | null  // 内部维护父子关系
    _scopeId?: string              // 事件作用域 ID（从根节点继承）
}

// ============================================
// 事件映射
// ============================================
const EVENT_MAP: Record<string, string> = {
    onClick: 'tap',
    onTap: 'tap',
    onLongPress: 'longpress',
    onInput: 'input',
    onChange: 'change',
    onFocus: 'focus',
    onBlur: 'blur',
}

// ============================================
// Custom Renderer 实现
// ============================================
let nodeIdCounter = 0

const nodeOps: RendererOptions<InternalNode, InternalNode> = {
    createElement(type: string): InternalNode {
        return reactive({
            id: ++nodeIdCounter,
            type,
            props: {},
            children: [],
            _parent: null
        }) as unknown as InternalNode
    },

    createText(text: string): InternalNode {
        const node = reactive({
            id: ++nodeIdCounter,
            type: '#text',
            props: {},
            text,
            children: [],
            _parent: null
        }) as unknown as InternalNode
        return node
    },

    createComment(): InternalNode {
        return reactive({
            id: ++nodeIdCounter,
            type: '#comment',
            props: {},
            children: [],
            _parent: null
        }) as unknown as InternalNode
    },

    setText(node: InternalNode, text: string): void {
        node.text = text
    },

    setElementText(node: InternalNode, text: string): void {
        node.children = []
        node.text = text
    },

    insert(child: InternalNode, parent: InternalNode, anchor?: InternalNode | null): void {
        // 从旧父节点移除
        if (child._parent) {
            const idx = child._parent.children.indexOf(child)
            if (idx > -1) child._parent.children.splice(idx, 1)
        }

        // 设置新父节点
        child._parent = parent

        // 插入到父节点
        if (anchor) {
            const idx = parent.children.indexOf(anchor)
            if (idx > -1) {
                parent.children.splice(idx, 0, child)
                return
            }
        }
        parent.children.push(child)
    },

    remove(child: InternalNode): void {
        if (child._parent) {
            const idx = child._parent.children.indexOf(child)
            if (idx > -1) child._parent.children.splice(idx, 1)
            child._parent = null
        }
    },

    parentNode(node: InternalNode): InternalNode | null {
        return node._parent || null
    },

    nextSibling(node: InternalNode): InternalNode | null {
        if (!node._parent) return null
        const siblings = node._parent.children
        const idx = siblings.indexOf(node)
        return idx > -1 && idx < siblings.length - 1 ? siblings[idx + 1] : null
    },

    patchProp(el: InternalNode, key: string, prevValue: any, nextValue: any): void {
        // 处理事件
        if (key.startsWith('on') && typeof nextValue === 'function') {
            const eventType = key.slice(2).toLowerCase()
            const mappedEvent = EVENT_MAP[key] || eventType

            // 获取作用域 ID（沿着 _parent 链向上查找 root 节点的 _scopeId）
            let scopeId: string | undefined
            let node: InternalNode | null | undefined = el
            while (node) {
                if (node._scopeId) {
                    scopeId = node._scopeId
                    break
                }
                node = node._parent
            }

            // 使用我们自己的事件注册系统（带作用域）
            const eventId = registerEvent(nextValue, scopeId)
            el.props[`bind${mappedEvent}`] = eventId
            // 为每种事件类型存储独立的 eventId
            el.props[`data-eid-${mappedEvent}`] = eventId

            return
        }

        // 处理 class
        if (key === 'class') {
            el.props.class = normalizeClass(nextValue)
            return
        }

        // 处理 style
        if (key === 'style') {
            el.props.style = normalizeStyle(nextValue)
            return
        }

        // 其他属性
        if (nextValue == null) {
            delete el.props[key]
        } else {
            el.props[key] = nextValue
        }
    },

    cloneNode(node: InternalNode): InternalNode {
        return reactive({
            id: ++nodeIdCounter,
            type: node.type,
            props: { ...node.props },
            text: node.text,
            children: [],
            _parent: null
        }) as unknown as InternalNode
    },

    insertStaticContent(): [InternalNode, InternalNode] {
        const node = nodeOps.createText('')
        return [node, node]
    }
}

// ============================================
// 辅助函数
// ============================================
function normalizeClass(value: any): string {
    if (typeof value === 'string') return value
    if (Array.isArray(value)) return value.filter(Boolean).join(' ')
    if (typeof value === 'object' && value) {
        return Object.entries(value)
            .filter(([_, v]) => v)
            .map(([k]) => k)
            .join(' ')
    }
    return ''
}

function normalizeStyle(value: any): string {
    if (typeof value === 'string') return value
    if (typeof value === 'object' && value) {
        return Object.entries(value)
            .map(([k, v]) => `${k}: ${v}`)
            .join('; ')
    }
    return ''
}

/**
 * 将 InternalNode 转换为纯 JSON 的 RenderNode
 * 移除内部字段 (_parent)，只保留渲染需要的数据
 */
export function toRenderNode(node: InternalNode): RenderNode {
    const renderNode: RenderNode = {
        id: node.id,
        type: node.type,
        props: { ...node.props },
        children: node.children.map(child => toRenderNode(child))
    }

    if (node.text !== undefined) {
        renderNode.text = node.text
    }

    return renderNode
}

// ============================================
// 创建渲染器
// ============================================
const { createApp: createRendererApp } = createRenderer<InternalNode, InternalNode>(nodeOps)

export { createRendererApp }
