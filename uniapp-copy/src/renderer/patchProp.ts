/**
 * 属性处理
 * 
 * 处理节点属性的更新
 */

import type { MPNode } from './nodeOps'
import { bindNodeEvent } from '../events'

/**
 * 更新节点属性
 */
export function patchProp(
    el: MPNode,
    key: string,
    prevValue: any,
    nextValue: any
): void {
    // 处理事件
    if (key.startsWith('on')) {
        const eventName = key.slice(2).toLowerCase()

        // 解绑旧事件
        if (prevValue) {
            // mitt 不需要显式解绑单个事件
        }

        // 绑定新事件
        if (nextValue) {
            bindNodeEvent(el.id, eventName, nextValue)
        }

        // 不存储事件处理器到 props（避免序列化问题）
        return
    }

    // 处理 class
    if (key === 'class') {
        el.props.class = normalizeClass(nextValue)
        return
    }

    // 处理 style
    if (key === 'style') {
        el.props.style = normalizeStyle(nextValue)
        return
    }

    // 其他属性直接设置
    if (nextValue === null || nextValue === undefined) {
        delete el.props[key]
    } else {
        el.props[key] = nextValue
    }
}

/**
 * 规范化 class
 */
function normalizeClass(value: any): string {
    if (typeof value === 'string') {
        return value
    }

    if (Array.isArray(value)) {
        return value.filter(Boolean).join(' ')
    }

    if (typeof value === 'object') {
        return Object.keys(value)
            .filter(key => value[key])
            .join(' ')
    }

    return ''
}

/**
 * 规范化 style
 */
function normalizeStyle(value: any): string {
    if (typeof value === 'string') {
        return value
    }

    if (typeof value === 'object') {
        return Object.entries(value)
            .map(([key, val]) => `${kebabCase(key)}: ${val}`)
            .join('; ')
    }

    return ''
}

/**
 * 驼峰转短横线
 */
function kebabCase(str: string): string {
    return str.replace(/([A-Z])/g, '-$1').toLowerCase()
}
