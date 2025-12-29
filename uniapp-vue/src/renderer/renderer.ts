/**
 * 自定义渲染器
 * 
 * 使用 Vue 的 createRenderer 创建小程序渲染器
 */

import { createRenderer, h as vueH } from '@vue/runtime-core'
import {
    createElement,
    createText,
    createComment,
    insert,
    remove,
    setElementText,
    setText,
    parentNode,
    nextSibling,
    type MPNode
} from './nodeOps'
import { patchProp } from './patchProp'
import { serializeTree } from './serialize'

// 渲染更新回调
type UpdateCallback = (tree: any) => void

let updateCallback: UpdateCallback | null = null
let rootNode: MPNode | null = null

/**
 * 设置渲染更新回调
 */
export function setUpdateCallback(callback: UpdateCallback): void {
    updateCallback = callback
}

/**
 * 创建自定义渲染器
 */
const { render } = createRenderer<MPNode, MPNode>({
    // 创建元素
    createElement,

    // 创建文本节点
    createText,

    // 创建注释节点
    createComment,

    // 插入节点
    insert,

    // 移除节点
    remove,

    // 设置元素文本
    setElementText,

    // 设置文本节点内容
    setText,

    // 获取父节点
    parentNode,

    // 获取下一个兄弟节点
    nextSibling,

    // 更新属性
    patchProp,

    // 克隆节点
    cloneNode(node: MPNode): MPNode {
        return {
            ...node,
            children: [...node.children]
        }
    },

    // 插入静态内容（小程序不支持）
    insertStaticContent() {
        return [null as any, null as any]
    }
})

/**
 * 创建根容器
 */
function createRoot(): MPNode {
    return {
        id: -1,
        type: '#root',
        props: {},
        children: []
    }
}

/**
 * 触发更新
 */
function triggerUpdate(): void {
    if (rootNode && updateCallback) {
        const serialized = serializeTree(rootNode)
        updateCallback(serialized)
    }
}

/**
 * 创建应用
 */
export function createApp(rootComponent: any) {
    rootNode = createRoot()

    return {
        mount() {
            // 创建 VNode
            const vnode = vueH(rootComponent)

            // 渲染到虚拟根节点
            render(vnode, rootNode!)

            // 触发更新
            triggerUpdate()

            return this
        },

        unmount() {
            if (rootNode) {
                render(null, rootNode)
                rootNode = null
            }
        }
    }
}

/**
 * 手动触发更新
 */
export function forceUpdate(): void {
    triggerUpdate()
}

/**
 * 获取根节点
 */
export function getRootNode(): MPNode | null {
    return rootNode
}
