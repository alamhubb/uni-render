/**
 * Vue Custom Renderer for MPNode
 * 
 * 两层架构：
 * 1. InternalNode - Custom Renderer 内部使用，维护父子关系
 * 2. MPNode - 纯 JSON 输出，给 RenderNode 渲染
 */

import {
    createRenderer,
    reactive,
    ref,
    computed,
    watchEffect,
    type RendererOptions,
    type Component
} from '@vue/runtime-core'
import type { MPNode } from './serialize'
// @ts-ignore
import { o as vOn } from '@dcloudio/uni-mp-vue'

// ============================================
// 内部节点类型（Custom Renderer 使用）
// ============================================
interface InternalNode {
    id: number
    type: string
    props: Record<string, any>
    text?: string
    children: InternalNode[]
    _parent?: InternalNode | null  // 内部维护父子关系
}

// ============================================
// 事件映射
// ============================================
const EVENT_MAP: Record<string, string> = {
    onClick: 'tap',
    onTap: 'tap',
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
        return reactive({
            id: ++nodeIdCounter,
            type: '#text',
            props: {},
            text,
            children: [],
            _parent: null
        }) as unknown as InternalNode
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
                console.log('[nodeOps.insert] 插入节点（anchor）', {
                    childType: child.type,
                    parentType: parent.type,
                    parentChildrenCount: parent.children.length
                })
                return
            }
        }
        parent.children.push(child)
        console.log('[nodeOps.insert] 插入节点', {
            childType: child.type,
            childId: child.id,
            parentType: parent.type,
            parentId: parent.id,
            parentChildrenCount: parent.children.length
        })
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
            const mappedEvent = EVENT_MAP[key] || key.slice(2).toLowerCase()
            try {
                const eventId = vOn(nextValue)
                el.props[`bind${mappedEvent}`] = eventId
            } catch {
                el.props[`bind${mappedEvent}`] = '__event__'
            }
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
 * 将 InternalNode 转换为纯 JSON 的 MPNode
 * 移除内部字段 (_parent)，只保留渲染需要的数据
 */
function toMPNode(node: InternalNode): MPNode {
    console.log('[toMPNode] 转换节点', {
        type: node.type,
        id: node.id,
        childrenCount: node.children?.length,
        text: node.text
    })

    const mpNode: MPNode = {
        id: node.id,
        type: node.type,
        props: { ...node.props },
        children: node.children.map(child => toMPNode(child))
    }

    if (node.text !== undefined) {
        mpNode.text = node.text
    }

    return mpNode
}

// ============================================
// 创建渲染器
// ============================================
const { render, createApp: createRendererApp } = createRenderer<InternalNode, InternalNode>(nodeOps)

// ============================================
// 导出的 API
// ============================================
export { h } from '@vue/runtime-core'

/**
 * useMPNodeRenderer - 响应式 MPNode 渲染器
 * 
 * 接受组件定义，使用 Custom Renderer 渲染到 InternalNode 树。
 * 
 * @example
 * ```ts
 * const MyComponent = {
 *   setup() {
 *     const count = ref(0)
 *     return () => h('view', {}, `计数: ${count.value}`)
 *   }
 * }
 * const mpNode = useMPNodeRenderer(MyComponent)
 * ```
 */
export function useMPNodeRenderer(component: Component) {
    // 创建内部根节点
    const rootNode = reactive({
        id: 0,
        type: 'root',
        props: {},
        children: [],
        _parent: null
    }) as unknown as InternalNode

    console.log('[useMPNodeRenderer] 初始化')

    // 使用 createApp 挂载组件
    const app = createRendererApp(component)
    app.mount(rootNode as any)

    // 转换为 MPNode（响应式）
    return computed(() => {
        const internalChild = rootNode.children[0] || rootNode

        console.log('[useMPNodeRenderer] computed 触发', {
            rootChildren: rootNode.children.length,
            childType: internalChild.type,
            childrenCount: internalChild.children?.length
        })
        return toMPNode(internalChild)
    })
}

/**
 * 创建 MPNode 应用
 */
export function createMPNodeApp(rootComponent: Component, props?: Record<string, any>) {
    const rootNode = reactive({
        id: 0,
        type: 'root',
        props: {},
        children: [],
        _parent: null
    }) as unknown as InternalNode

    const app = createRendererApp(rootComponent, props)

    return {
        mount() {
            app.mount(rootNode as any)
            return toMPNode(rootNode)
        },
        unmount() {
            app.unmount()
        }
    }
}
