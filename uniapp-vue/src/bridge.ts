/**
 * 桥接层
 * 
 * 连接渲染器和小程序页面（事件处理）
 */

import { createEventHandler } from './events'

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

