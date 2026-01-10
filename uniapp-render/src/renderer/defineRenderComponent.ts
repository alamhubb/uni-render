/**
 * defineRenderComponent
 *
 * 渲染函数组件包装器，负责和 UniApp 交互
 * 使用 <render-component :node="node" /> 模板
 * 自动处理 render() 调用和响应式桥接
 */

// 分别导入：
// - watch: 从 @vue/runtime-core，监听 Custom Renderer 的响应式变化
// - ref, defineComponent: 从 vue（UniApp Vue），模板使用和组件定义
import { watch } from '@vue/runtime-core'
import { ref as vueRef, defineComponent, onUnmounted } from 'vue'
import { render } from './render'

import type { Component } from '@vue/runtime-core'

export interface RenderComponentOptions {
    setup: (props?: any, ctx?: any) => () => any
    name?: string
    props?: Record<string, any>
}

/**
 * 定义一个渲染函数组件
 *
 * 自动处理：
 * 1. 调用 render() 获取 RenderNode
 * 2. 桥接 runtime-core 和 uni-h5-vue 的响应式系统
 * 3. 返回 node 供模板使用（配合 <render-component :node="node" />）
 *
 * @example
 * ```typescript
 * import { defineRenderComponent, ref, h } from 'uniapp-render'
 *
 * export default defineRenderComponent({
 *   setup() {
 *     const count = ref(0)
 *     return () => h('view', {}, [
 *       h('text', {}, `计数: ${count.value}`),
 *       h('button', { onClick: () => count.value++ }, '+1')
 *     ])
 *   }
 * })
 * ```
 */
export function defineRenderComponent(options: RenderComponentOptions) {
    const { setup: originalSetup, name, props: componentProps } = options

    return defineComponent({
        name,
        props: componentProps,
        setup(props: any, ctx: any) {
            // 1. 调用用户的 setup，获取渲染函数
            const renderFn = originalSetup(props, ctx)

            // 2. 包装为组件
            const InnerComponent: Component = {
                setup() {
                    return renderFn
                }
            }

            // 3. 使用 render() 获取 RenderNode
            const { node: nodeInternal, unmount } = render(InnerComponent)

            // 4. 创建响应式引用，供模板使用
            const node = vueRef(nodeInternal.value)

            // 5. 监听 nodeInternal 变化，同步到 node
            watch(
                () => nodeInternal.value,
                (newVal: any) => {
                    node.value = newVal
                },
                { deep: true }
            )

            // 6. 组件卸载时清理资源
            onUnmounted(() => {
                unmount()
            })

            // 7. 返回 node 给模板使用
            return { node }
        }
    })
}
