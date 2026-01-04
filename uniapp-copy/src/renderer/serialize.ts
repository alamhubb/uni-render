/**
 * MPNode 类型定义和序列化函数
 */

/**
 * 小程序节点数据结构
 * 用于 render.wxml 模板渲染
 */
export interface MPNode {
    /** 节点唯一 ID，用于事件绑定 */
    id: number
    /** 节点类型：view, text, button, input, image 等 */
    type: string
    /** 节点属性 */
    props: Record<string, any>
    /** 文本内容（仅文本节点） */
    text?: string
    /** 子节点 */
    children: MPNode[]
}

/**
 * 序列化后的节点结构（用于 setData）
 */
export type SerializedNode = MPNode

/**
 * 序列化 MPNode 树
 * 用于 setData 传输到渲染层
 */
export function serialize(node: MPNode): SerializedNode {
    // 当前实现直接返回，后续可添加优化（如压缩、diff）
    return node
}
