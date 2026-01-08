/**
 * RenderNode 类型定义
 * 
 * 渲染节点数据结构，用于模板渲染
 */

/**
 * 渲染节点数据结构
 */
export interface RenderNode {
    /** 节点唯一 ID */
    id: number
    /** 节点类型：view, text, button, input, image 等 */
    type: string
    /** 节点属性 */
    props: Record<string, any>
    /** 文本内容（仅文本节点） */
    text?: string
    /** 子节点 */
    children: RenderNode[]
}
