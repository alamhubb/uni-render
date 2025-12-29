/**
 * 自定义渲染器
 * 
 * 使用 Vue 的 createRenderer 创建小程序渲染器
 */

import { createRenderer } from '@vue/runtime-core'
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

// 微信小程序全局 API 声明
declare function getCurrentPages(): PageInstance[]

let rootNode: MPNode | null = null
let dataKey = 'vnodeTree'

/**
 * 获取当前页面实例
 * 使用微信小程序的 getCurrentPages() API
 */
function getPageInstance(): PageInstance | null {
    const pages = getCurrentPages()
    return pages.length > 0 ? pages[pages.length - 1] : null
}

/**
 * 创建自定义渲染器
 */
const { render, createApp: baseCreateApp } = createRenderer<MPNode, MPNode>({
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
    console.log('[Custom Renderer] triggerUpdate - page:', !!page, 'rootNode:', !!rootNode)
    if (rootNode && page) {
        const serialized = serializeTree(rootNode)
        console.log('[Custom Renderer] setData - vnodeTree:', JSON.stringify(serialized).slice(0, 200) + '...')
        page.setData({
            [dataKey]: serialized
        })
    }
}

/**
 * 创建应用
 * 
 * 包装 Vue 的 createApp，添加自动 setData 功能
 */
export function createApp(rootComponent: any) {
    console.log('[Custom Renderer] createApp - 使用自定义渲染器创建应用')

    // 创建虚拟根节点
    rootNode = createRoot()

    // 注册更新调度器，使 nodeOps 能够自动触发更新
    setUpdateScheduler(triggerUpdate)

    // 使用 Vue 返回的 createApp，这样才有完整的响应式支持
    const app = baseCreateApp(rootComponent)

    // 包装 mount 方法
    const originalMount = app.mount
    app.mount = () => {
        console.log('[Custom Renderer] mount - 挂载到虚拟根节点')

        // 挂载到我们的虚拟根节点
        const result = originalMount.call(app, rootNode as any)

        // 触发初始更新
        triggerUpdate()

        return result
    }

    return app
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
