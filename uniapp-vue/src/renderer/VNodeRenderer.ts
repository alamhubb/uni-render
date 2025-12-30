/**
 * 递归渲染器 - 将 vnodeTree 渲染为真实 DOM
 * 
 * 用法：
 * import { VNodeRenderer } from './render'
 * 
 * <VNodeRenderer vnodeTree={vnodeTree} onNodeTap={handleTap} />
 */

import { h, defineComponent, PropType } from 'vue'

// VNode 节点类型定义
export interface VNode {
    id: number
    type: string
    props: Record<string, any>
    children: VNode[]
    text?: string
}

/**
 * 递归渲染节点
 */
function renderNode(node: VNode, onNodeTap?: (id: number, event: Event) => void): any {
    if (!node) return null

    const { id, type, props = {}, children = [], text } = node

    // 通用属性
    const commonProps = {
        id: `node-${id}`,
        class: props.class,
        style: props.style,
        'data-id': id,
        onClick: onNodeTap ? (e: Event) => onNodeTap(id, e) : undefined
    }

    // 递归渲染子节点
    const renderChildren = () =>
        children.map(child => renderNode(child, onNodeTap))

    switch (type) {
        case 'view':
        case 'div':
            return h('div', commonProps, renderChildren())

        case 'text':
        case 'span':
            return h('span', commonProps, renderChildren())

        case 'button':
            return h('button', {
                ...commonProps,
                type: props.type || 'button',
                disabled: props.disabled
            }, renderChildren())

        case 'image':
        case 'img':
            return h('img', {
                ...commonProps,
                src: props.src,
                alt: props.alt || ''
            })

        case 'input':
            return h('input', {
                ...commonProps,
                value: props.value,
                type: props.type || 'text',
                placeholder: props.placeholder,
                disabled: props.disabled
            })

        case '#text':
            // 纯文本节点
            return text || ''

        case '#comment':
            // 注释节点，不渲染
            return null

        case '#root':
            // 根节点，只渲染子节点
            return h('div', { class: 'vnode-root' }, renderChildren())

        default:
            // 未知节点类型，作为 div 处理
            console.warn(`[VNodeRenderer] Unknown node type: ${type}`)
            return h('div', commonProps, renderChildren())
    }
}

/**
 * VNode 渲染器组件
 * 
 * 将 vnodeTree 数据结构渲染为真实 DOM
 */
export const VNodeRenderer = defineComponent({
    name: 'VNodeRenderer',

    props: {
        vnodeTree: {
            type: Object as PropType<VNode>,
            required: true
        },
        onNodeTap: {
            type: Function as PropType<(id: number, event: Event) => void>,
            default: undefined
        },
        onNodeInput: {
            type: Function as PropType<(id: number, value: string) => void>,
            default: undefined
        }
    },

    setup(props) {
        return () => {
            if (!props.vnodeTree) {
                return h('div', { class: 'vnode-empty' }, '暂无内容')
            }

            return renderNode(props.vnodeTree, props.onNodeTap)
        }
    }
})

/**
 * 直接渲染函数（不使用组件）
 * 
 * 用法：
 * render(vnodeTree, onNodeTap)
 */
export function render(vnodeTree: VNode, onNodeTap?: (id: number, event: Event) => void) {
    return renderNode(vnodeTree, onNodeTap)
}

export default VNodeRenderer
