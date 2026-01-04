/**
 * useRenderNode - 兼容微信小程序的动态渲染 Hook
 *
 * 【架构说明 - 真机小程序双线程】
 * - 逻辑层：事件处理函数存储在全局 eventHandlers 里（不能被序列化）
 * - 渲染层：MPNode 只包含事件 ID 字符串（可序列化通过 setData 传递）
 * - 事件触发：渲染层触发 → 通过事件 ID 查找 → 调用逻辑层的处理函数
 *
 * 【数据结构】
 * 双层 Map: Map<componentId, Map<eventId, Function>>
 *
 * 使用方式：
 * ```vue
 * <template>
 *   <RenderNode :node="node" />
 * </template>
 *
 * <script setup>
 * import { h, ref } from 'vue'
 * import { useRenderNode, RenderNode } from 'uniapp-render'
 *
 * const count = ref(0)
 *
 * const { node } = useRenderNode(() =>
 *   h('view', {}, [
 *     h('text', {}, `计数: ${count.value}`),
 *     h('button', { onClick: () => count.value++ }, '+1')
 *   ])
 * )
 * </script>
 * ```
 */

import { ref, watchEffect, getCurrentInstance, provide, onUnmounted, type Ref } from 'vue'
import type { VNode } from 'vue'
import type { MPNode } from './serialize'
import { vnodeToMPNode, createConvertContext } from './converter'

// ============================================
// 全局事件存储 - 双层 Map
// ============================================

// 小程序运行时全局函数声明
declare function getApp(): any

/**
 * 获取全局事件处理器存储
 * 双层 Map: Map<componentId, Map<eventId, Function>>
 */
function getGlobalEventHandlers(): Map<number, Map<string, Function>> {
    // 尝试获取 getApp()（UniApp/小程序环境）
    if (typeof getApp === 'function') {
        try {
            const app = getApp()
            if (app) {
                if (!app.globalData) {
                    app.globalData = {}
                }
                if (!app.globalData.__eventHandlers__) {
                    app.globalData.__eventHandlers__ = new Map<number, Map<string, Function>>()
                }
                return app.globalData.__eventHandlers__
            }
        } catch (e) {
            // getApp 可能在某些环境下抛出错误
        }
    }

    // 降级：使用全局变量（H5 环境）
    if (!(globalThis as any).__eventHandlers__) {
        (globalThis as any).__eventHandlers__ = new Map<number, Map<string, Function>>()
    }
    return (globalThis as any).__eventHandlers__
}

/**
 * 获取或创建组件的事件 Map
 */
export function getComponentEventMap(componentId: number): Map<string, Function> {
    const globalMap = getGlobalEventHandlers()
    let componentMap = globalMap.get(componentId)
    if (!componentMap) {
        componentMap = new Map()
        globalMap.set(componentId, componentMap)
    }
    return componentMap
}

/**
 * 获取指定组件的事件 Map（只读）
 */
export function getEventHandlers(componentId: number): Map<string, Function> | null {
    return getGlobalEventHandlers().get(componentId) || null
}

/**
 * 清理指定组件的事件
 */
export function cleanupEventHandlers(componentId: number): void {
    getGlobalEventHandlers().delete(componentId)
}

// ============================================
// 事件触发
// ============================================

/**
 * 触发事件（RenderNode 调用此函数）
 * 
 * @param componentId - 组件 ID
 * @param eventId - 事件 ID（如 'e0', 'e1'）
 * @param event - 事件对象
 * @returns 是否成功触发
 */
export function triggerEventById(componentId: number, eventId: string, event?: any): boolean {
    const handlers = getEventHandlers(componentId)

    if (!handlers) {
        console.warn(`[useRenderNode] 组件事件 Map 不存在: componentId=${componentId}`)
        return false
    }

    const handler = handlers.get(eventId)

    if (!handler) {
        console.warn(`[useRenderNode] 事件处理器不存在: eventId=${eventId}`)
        return false
    }

    handler(event)
    return true
}

// ============================================
// 小程序原生组件事件代理
// ============================================

/**
 * 在小程序组件实例上设置事件代理
 * 
 * 用于微信小程序原生 Component：
 * WXML 的 `bindtap="e0"` 需要组件实例上有 `e0` 方法
 * 
 * @param instance - 小程序组件实例（this）
 * @param eventHandlers - 事件处理器 Map
 * @param maxEvents - 预注册的最大事件数量（默认 100）
 */
export function setupEventProxy(
    instance: any,
    eventHandlers: Map<string, Function>,
    maxEvents: number = 100
): void {
    instance._eventHandlers = eventHandlers
    for (let i = 0; i < maxEvents; i++) {
        const eventId = `e${i}`
        instance[eventId] = function (e: any) {
            const handler = instance._eventHandlers?.get(eventId)
            if (handler) {
                return handler(e)
            }
        }
    }
}

// ============================================
// useRenderNode Hook
// ============================================

/**
 * useRenderNode 返回值
 */
export interface UseRenderNodeReturn {
    /**
     * 响应式的 MPNode 数据
     * 纯 JSON，可通过 setData 传递
     */
    node: Ref<MPNode | null>

    /**
     * 组件 ID（用于事件查找）
     */
    componentId: number

    /**
     * 事件处理器 Map（用于调试或 setupEventProxy）
     */
    eventHandlers: Map<string, Function>
}

/**
 * 兼容微信小程序的动态渲染 Hook
 *
 * @param renderFn - 渲染函数，返回 VNode
 * @returns { node, componentId, eventHandlers }
 */
export function useRenderNode(renderFn: () => VNode): UseRenderNodeReturn {
    const instance = getCurrentInstance()
    const componentId = instance?.uid ?? 0  // 使用数字 ID，更高效

    // 获取或创建组件的事件 Map
    const eventHandlers = getComponentEventMap(componentId)

    // 为子组件 provide componentId
    provide('__componentId__', componentId)

    // 响应式 MPNode
    const node = ref<MPNode | null>(null)

    // 响应式追踪 + 转换
    watchEffect(() => {
        // 每次渲染前清空事件（eventId 会复用）
        eventHandlers.clear()

        // 创建转换上下文
        const ctx = createConvertContext(eventHandlers)

        // 执行 render 函数
        const vnode = renderFn()

        // VNode → MPNode
        const mpNode = vnodeToMPNode(vnode, ctx)

        // 在 MPNode 根节点注入 componentId
        if (mpNode.props) {
            mpNode.props.__componentId__ = componentId
        }

        node.value = mpNode
    })

    // 组件卸载时清理
    onUnmounted(() => {
        cleanupEventHandlers(componentId)
    })

    return {
        node,
        componentId,
        eventHandlers
    }
}
