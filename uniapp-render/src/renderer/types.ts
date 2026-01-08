/**
 * MPNode 类型定义
 * 
 * 小程序节点数据结构，用于 RenderNode 模板渲染
 */

/**
 * 小程序节点数据结构
 */
export interface MPNode {
    /** 节点唯一 ID */
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
 * 目前与 MPNode 相同
 */
export type SerializedNode = MPNode
