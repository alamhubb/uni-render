/**
 * 小程序渲染器 - 极简版
 * 
 * 原则：
 * 1. 只支持小程序，不考虑 web/dom
 * 2. 不做额外性能优化，跟随 Vue 原生性能
 * 3. 代码尽量简单
 */

import { createRenderer, RendererOptions } from '@vue/runtime-core'
import { isOn } from '@vue/shared'

// ============================================
// 节点类型定义（超级简单）
// ============================================

let nodeId = 0

export interface MPNode {
    id: number              // 唯一标识
    type: string            // 标签名: 'view', 'text', 'button' 等
    props: Record<string, any>  // 属性
    children: MPNode[]      // 子节点
    parent: MPNode | null   // 父节点
    text?: string           // 文本内容（仅文本节点）
}

// ============================================
// 全局状态
// ============================================

// 根节点
let rootNode: MPNode | null = null

// setData 回调（由小程序页面注入）
let setDataCallback: ((data: any) => void) | null = null

/**
 * 注册 setData 回调
 * 小程序页面 onLoad 时调用
 */
export function registerSetData(callback: (data: any) => void) {
    setDataCallback = callback
    console.log('[MP Renderer] setData callback registered')
}

/**
 * 获取根节点（供页面渲染使用）
 */
export function getRootNode(): MPNode | null {
    return rootNode
}

// ============================================
// 工具函数
// ============================================

/**
 * 创建节点
 */
function createNode(type: string): MPNode {
    return {
        id: nodeId++,
        type,
        props: {},
        children: [],
        parent: null,
    }
}

/**
 * 序列化整个树为 setData 格式
 */
function serializeTree(node: MPNode): any {
    const result: any = {
        id: node.id,
        type: node.type,
        props: { ...node.props },
    }

    if (node.text !== undefined) {
        result.text = node.text
    }

    if (node.children.length > 0) {
        result.children = node.children.map(child => serializeTree(child))
    }

    return result
}

/**
 * 触发 setData 更新
 * 每次 Vue 操作后调用，将整棵树同步到渲染层
 */
function triggerUpdate() {
    if (!rootNode) return

    if (setDataCallback) {
        const data = { root: serializeTree(rootNode) }
        console.log('[MP Renderer] setData:', JSON.stringify(data, null, 2))
        setDataCallback(data)
    } else {
        console.log('[MP Renderer] No setData callback, tree updated:', rootNode)
    }
}

// ============================================
// Vue Renderer 选项（核心！）
// ============================================

const nodeOps: Omit<RendererOptions<MPNode, MPNode>, 'patchProp'> = {

    // 创建元素
    createElement(type: string): MPNode {
        const node = createNode(type)
        console.log(`[MP Renderer] createElement: ${type}`, node.id)
        return node
    },

    // 创建文本节点
    createText(text: string): MPNode {
        const node = createNode('#text')
        node.text = text
        console.log(`[MP Renderer] createText: "${text}"`, node.id)
        return node
    },

    // 创建注释节点（小程序不支持，返回空节点）
    createComment(text: string): MPNode {
        const node = createNode('#comment')
        node.text = text
        return node
    },

    // 设置文本内容
    setText(node: MPNode, text: string): void {
        node.text = text
        console.log(`[MP Renderer] setText: "${text}"`, node.id)
        triggerUpdate()
    },

    // 设置元素文本（清空子节点，设置纯文本）
    setElementText(el: MPNode, text: string): void {
        el.children = []
        el.text = text
        console.log(`[MP Renderer] setElementText: "${text}"`, el.id)
        triggerUpdate()
    },

    // 插入节点
    insert(child: MPNode, parent: MPNode, anchor?: MPNode | null): void {
        // 防御性检查：确保 parent 是有效的 MPNode
        if (!parent || !parent.children) {
            console.warn('[MP Renderer] insert: invalid parent, using root node', parent)
            // 如果没有根节点，创建一个
            if (!rootNode) {
                rootNode = createNode('root')
            }
            parent = rootNode
        }

        // 先从旧父节点移除
        if (child.parent && child.parent.children) {
            const oldParent = child.parent
            const idx = oldParent.children.indexOf(child)
            if (idx !== -1) {
                oldParent.children.splice(idx, 1)
            }
        }

        // 设置新父节点
        child.parent = parent

        // 插入到指定位置
        if (anchor && parent.children) {
            const anchorIdx = parent.children.indexOf(anchor)
            if (anchorIdx !== -1) {
                parent.children.splice(anchorIdx, 0, child)
            } else {
                parent.children.push(child)
            }
        } else {
            parent.children.push(child)
        }

        console.log(`[MP Renderer] insert: ${child.type}#${child.id} into ${parent.type}#${parent.id}`)
        triggerUpdate()
    },

    // 移除节点
    remove(child: MPNode): void {
        if (child.parent) {
            const idx = child.parent.children.indexOf(child)
            if (idx !== -1) {
                child.parent.children.splice(idx, 1)
            }
            child.parent = null
        }
        console.log(`[MP Renderer] remove: ${child.type}#${child.id}`)
        triggerUpdate()
    },

    // 获取父节点
    parentNode(node: MPNode): MPNode | null {
        return node.parent
    },

    // 获取下一个兄弟节点
    nextSibling(node: MPNode): MPNode | null {
        if (!node.parent) return null
        const siblings = node.parent.children
        const idx = siblings.indexOf(node)
        return siblings[idx + 1] || null
    },

    // 查询选择器（小程序中用于 app.mount）
    querySelector(selector: string): MPNode | null {
        console.log(`[MP Renderer] querySelector: ${selector}`)

        // 确保根节点存在
        if (!rootNode) {
            rootNode = createNode('root')
            console.log('[MP Renderer] Created root node')
        }

        // 根选择器
        if (selector === '#app' || selector === '#root') {
            return rootNode
        }

        // ID 选择器：查找或创建对应容器
        if (selector.startsWith('#')) {
            const id = selector.slice(1)

            // 在根节点的子节点中查找
            const found = rootNode.children.find(child => child.props.id === id)
            if (found) {
                return found
            }

            // 如果没找到，创建一个新容器
            const container = createNode('view')
            container.props.id = id
            container.parent = rootNode
            rootNode.children.push(container)
            console.log(`[MP Renderer] Created container: #${id}`)
            return container
        }

        console.warn(`[MP Renderer] querySelector not fully supported: ${selector}`)
        return null
    },
}

// 处理属性
function patchProp(
    el: MPNode,
    key: string,
    prevValue: any,
    nextValue: any
): void {
    // 事件处理
    if (isOn(key)) {
        const eventName = key.slice(2).toLowerCase()
        // 存储事件处理器
        if (!el.props._events) {
            el.props._events = {}
        }
        el.props._events[eventName] = nextValue
        console.log(`[MP Renderer] bindEvent: ${eventName} on ${el.type}#${el.id}`)
    }
    // 样式
    else if (key === 'style') {
        if (typeof nextValue === 'string') {
            el.props.style = nextValue
        } else if (nextValue && typeof nextValue === 'object') {
            // 对象样式转字符串
            el.props.style = Object.entries(nextValue)
                .map(([k, v]) => `${k.replace(/([A-Z])/g, '-$1').toLowerCase()}:${v}`)
                .join(';')
        } else {
            el.props.style = ''
        }
    }
    // 类名
    else if (key === 'class') {
        el.props.class = nextValue || ''
    }
    // 其他属性
    else {
        if (nextValue == null || nextValue === false) {
            delete el.props[key]
        } else {
            el.props[key] = nextValue === true ? '' : nextValue
        }
    }

    console.log(`[MP Renderer] patchProp: ${key}=${nextValue} on ${el.type}#${el.id}`)
    triggerUpdate()
}

// ============================================
// 创建渲染器
// ============================================

const { render, createApp: baseCreateApp } = createRenderer({
    patchProp,
    ...nodeOps,
})

// 包装 createApp，自动挂载到根节点
export function createApp(rootComponent: any, rootProps?: any) {
    const app = baseCreateApp(rootComponent, rootProps)

    const originalMount = app.mount
    app.mount = (container?: string | MPNode) => {
        // 默认挂载到 #app
        const target = container || '#app'
        console.log(`[MP Renderer] Mounting app to ${target}`)
        return originalMount(target as any)
    }

    return app
}

// 导出
export { render }

