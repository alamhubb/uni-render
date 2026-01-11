/**
 * render - 用户 API
 * 
 * 将 Vue 组件渲染为响应式的 RenderNode
 */

import {
    reactive,
    computed,
    type Component
} from '@vue/runtime-core'
import { createRendererApp, toRenderNode, type InternalNode } from './customRenderer'
import { createEventScope, clearEventScope } from './event'

/**
 * render - 响应式渲染器
 * 
 * 支持两种模式：
 * 1. 组件定义模式（推荐用于复杂场景）
 * 2. 渲染函数模式（简单场景）
 * 
 * @example 组件定义模式
 * ```ts
 * const MyComponent = {
 *   setup() {
 *     const count = ref(0)
 *     return () => h('view', {}, `计数: ${count.value}`)
 *   }
 * }
 * const node = render(MyComponent)
 * ```
 * 
 * @example 渲染函数模式
 * ```ts
 * const count = ref(0)
 * const node = render(() => 
 *   h('view', {}, `计数: ${count.value}`)
 * )
 * ```
 */
export function render(componentOrRenderFn: Component | (() => any)) {
    // 创建事件作用域
    const scopeId = createEventScope()

    // 创建内部根节点
    const rootNode = reactive({
        id: 0,
        type: 'root',
        props: {},
        children: [],
        _parent: null,
        _scopeId: scopeId  // 存储作用域 ID，供 patchProp 使用
    }) as unknown as InternalNode

    // 判断是组件定义还是渲染函数
    const isRenderFn = typeof componentOrRenderFn === 'function' &&
        !('setup' in componentOrRenderFn) &&
        !('render' in componentOrRenderFn)

    let app: ReturnType<typeof createRendererApp>

    if (isRenderFn) {
        // 渲染函数模式：包装为组件
        const WrapperComponent = {
            setup() {
                return componentOrRenderFn as () => any
            }
        }
        app = createRendererApp(WrapperComponent)
    } else {
        // 组件定义模式
        console.log('[render] 使用组件定义模式')
        app = createRendererApp(componentOrRenderFn as Component)
    }

    console.log('[render] 开始 mount')
    app.mount(rootNode as any)
    console.log('[render] mount 完成, rootNode.children:', rootNode.children.length)

    // 转换为 RenderNode（响应式）
    const node = computed(() => {
        const internalChild = rootNode.children[0] || rootNode
        return toRenderNode(internalChild)
    })

    // 卸载函数：清理应用和事件
    const unmount = () => {
        // 使用 scopeId 清理该作用域的所有事件
        clearEventScope(scopeId)
        app.unmount()
    }

    // 返回 node 和 unmount 函数
    return { node, unmount }
}
