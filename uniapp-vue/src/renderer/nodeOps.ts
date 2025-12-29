/**
 * 节点操作
 * 
 * 定义虚拟节点类型和操作函数
 */

// 虚拟节点类型
export interface MPNode {
    id: number
    type: string
    props: Record<string, any>
    children: MPNode[]
    text?: string
    parent?: MPNode
}

// 节点 ID 计数器
let nodeId = 0

// 更新调度相关
let updateScheduler: (() => void) | null = null
let dirty = false

/**
 * 设置更新调度器
 * 由 renderer 调用，传入触发更新的函数
 */
export function setUpdateScheduler(scheduler: () => void): void {
    updateScheduler = scheduler
}

/**
 * 调度更新
 * 使用微任务批量处理，避免频繁调用 setData
 */
function scheduleUpdate(): void {
    if (!updateScheduler || dirty) return

    console.log('[Custom Renderer] scheduleUpdate - 调度更新')
    dirty = true
    queueMicrotask(() => {
        if (updateScheduler) {
            console.log('[Custom Renderer] queueMicrotask - 执行更新')
            updateScheduler()
        }
        dirty = false
    })
}

/**
 * 创建元素节点
 */
export function createElement(type: string): MPNode {
    return {
        id: nodeId++,
        type,
        props: {},
        children: []
    }
}

/**
 * 创建文本节点
 */
export function createText(text: string): MPNode {
    return {
        id: nodeId++,
        type: '#text',
        props: {},
        children: [],
        text
    }
}

/**
 * 创建注释节点
 */
export function createComment(text: string): MPNode {
    return {
        id: nodeId++,
        type: '#comment',
        props: {},
        children: [],
        text
    }
}

/**
 * 插入节点
 */
export function insert(child: MPNode, parent: MPNode, anchor?: MPNode | null): void {
    child.parent = parent

    if (anchor) {
        const index = parent.children.indexOf(anchor)
        if (index !== -1) {
            parent.children.splice(index, 0, child)
            scheduleUpdate()
            return
        }
    }

    parent.children.push(child)
    scheduleUpdate()
}

/**
 * 移除节点
 */
export function remove(child: MPNode): void {
    const parent = child.parent
    if (parent) {
        const index = parent.children.indexOf(child)
        if (index !== -1) {
            parent.children.splice(index, 1)
            scheduleUpdate()
        }
    }
}

/**
 * 设置元素文本内容
 */
export function setElementText(node: MPNode, text: string): void {
    node.children = [{
        id: nodeId++,
        type: '#text',
        props: {},
        children: [],
        text
    }]
    scheduleUpdate()
}

/**
 * 设置文本节点内容
 */
export function setText(node: MPNode, text: string): void {
    node.text = text
    scheduleUpdate()
}

/**
 * 获取父节点
 */
export function parentNode(node: MPNode): MPNode | null {
    return node.parent || null
}

/**
 * 获取下一个兄弟节点
 */
export function nextSibling(node: MPNode): MPNode | null {
    const parent = node.parent
    if (!parent) return null

    const index = parent.children.indexOf(node)
    if (index !== -1 && index < parent.children.length - 1) {
        return parent.children[index + 1]
    }

    return null
}

/**
 * 重置节点 ID（用于测试）
 */
export function resetNodeId(): void {
    nodeId = 0
}
