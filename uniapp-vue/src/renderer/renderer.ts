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
    setUpdateScheduler,
    type MPNode
} from './nodeOps'
import { patchProp } from './patchProp'
import { serializeTree } from './serialize'

// 小程序页面实例接口
interface PageInstance {
    setData: (data: Record<string, any>, callback?: () => void) => void
    data: Record<string, any>
}

// 声明全局变量
declare global {
    interface Window {
        __currentPage__?: PageInstance
    }
}

let rootNode: MPNode | null = null
let dataKey = 'vnodeTree'

/**
 * 获取当前页面实例
 * 自动从 window.__currentPage__ 获取，由 miniapp-runtime 设置
 */
function getPageInstance(): PageInstance | null {
    return typeof window !== 'undefined' ? window.__currentPage__ || null : null
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
 * 将虚拟树序列化并通过 setData 发送到小程序
 */
function triggerUpdate(): void {
    const page = getPageInstance()
    if (rootNode && page) {
        const serialized = serializeTree(rootNode)
        page.setData({
            [dataKey]: serialized
        })
    }
}

/**
 * 创建应用
 */
export function createApp(rootComponent: any) {
    rootNode = createRoot()

    // 注册更新调度器，使 nodeOps 能够自动触发更新
    setUpdateScheduler(triggerUpdate)

    return {
        mount() {
            // 创建 VNode
            const vnode = vueH(rootComponent)

            // 渲染到虚拟根节点
            render(vnode, rootNode!)

            // 触发初始更新
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
