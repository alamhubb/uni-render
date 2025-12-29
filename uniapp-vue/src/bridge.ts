/**
 * 桥接层
 * 
 * 连接渲染器和小程序页面
 */

import { setUpdateCallback } from './renderer'
import { createEventHandler } from './events'
import type { SerializedNode } from './renderer/serialize'

/**
 * 小程序页面实例接口
 */
interface PageInstance {
    setData: (data: Record<string, any>, callback?: () => void) => void
    data: Record<string, any>
}

/**
 * 桥接配置
 */
export interface BridgeOptions {
    /**
     * 数据 key 名称
     * @default 'vnodeTree'
     */
    dataKey?: string

    /**
     * 更新后回调
     */
    onUpdate?: (data: SerializedNode) => void
}

/**
 * 创建桥接
 * 
 * 连接自定义渲染器和小程序页面
 * 
 * @param pageInstance 小程序页面实例
 * @param options 配置
 */
export function createBridge(
    pageInstance: PageInstance,
    options: BridgeOptions = {}
): void {
    const { dataKey = 'vnodeTree', onUpdate } = options

    setUpdateCallback((tree: SerializedNode) => {
        pageInstance.setData({
            [dataKey]: tree
        }, () => {
            onUpdate?.(tree)
        })
    })
}

/**
 * 创建页面事件处理器
 * 
 * 用法：
 * ```javascript
 * Page({
 *   ...createPageHandlers(),
 *   onLoad() { ... }
 * })
 * ```
 */
export function createPageHandlers() {
    return {
        onNodeTap: createEventHandler('tap'),
        onNodeClick: createEventHandler('click'),
        onNodeInput: createEventHandler('input'),
        onNodeChange: createEventHandler('change'),
        onNodeFocus: createEventHandler('focus'),
        onNodeBlur: createEventHandler('blur'),
        onNodeLongpress: createEventHandler('longpress'),
        onNodeTouchstart: createEventHandler('touchstart'),
        onNodeTouchmove: createEventHandler('touchmove'),
        onNodeTouchend: createEventHandler('touchend'),
    }
}
