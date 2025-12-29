/**
 * 序列化
 * 
 * 将虚拟节点树序列化为可 setData 的数据结构
 */

import type { MPNode } from './nodeOps'

// 序列化后的节点类型（用于 setData）
export interface SerializedNode {
    id: number
    type: string
    props: Record<string, any>
    text?: string
    children: SerializedNode[]
}

/**
 * 序列化单个节点
 */
export function serializeNode(node: MPNode): SerializedNode {
    return {
        id: node.id,
        type: node.type,
        props: { ...node.props },
        text: node.text,
        children: node.children.map(serializeNode)
    }
}

/**
 * 序列化整棵树
 */
export function serializeTree(root: MPNode): SerializedNode {
    return serializeNode(root)
}

/**
 * 差异序列化（优化性能）
 * 
 * 只序列化变化的部分
 * TODO: 实现增量更新
 */
export function serializeDiff(
    oldTree: SerializedNode | null,
    newRoot: MPNode
): SerializedNode {
    // 暂时使用全量序列化
    return serializeTree(newRoot)
}
