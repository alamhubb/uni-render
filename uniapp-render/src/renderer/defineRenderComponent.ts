/**
 * defineRenderComponent
 * 
 * 专门用于渲染函数组件的包装器
 * 自动处理 render() 调用和响应式桥接
 */

// ⚠️ 关键：分别导入
// - watch: 从 @vue/runtime-core，监听 Custom Renderer 的响应式变化
// - ref, defineComponent: 从 vue（UniApp），模板使用和组件定义
import { watch } from '@vue/runtime-core'
import { ref, defineComponent } from 'vue'
import { render } from './render'
import type { Component } from '@vue/runtime-core'

// 【调试】模块加载标识
const DEFINE_RENDER_MODULE_ID = Math.random().toString(36).substring(2, 8)
console.log('[defineRenderComponent.ts] 模块加载，ID =', DEFINE_RENDER_MODULE_ID)

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
 * 3. 返回 node 供模板使用
 * 
 * @example
 * ```typescript
 * import { defineComponent, ref, h } from 'uniapp-render'
 * 
 * export default defineComponent({
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

    // 使用 Vue 的 defineComponent 包装
    return defineComponent({
        name,
        props: componentProps,
        setup(props: any, ctx: any) {
            console.log('[defineRenderComponent] setup called')

            // 1. 调用用户的 setup，获取渲染函数
            const renderFn = originalSetup(props, ctx)
            console.log('[defineRenderComponent] got renderFn')

            // 2. 包装为组件
            const InnerComponent: Component = {
                setup() {
                    console.log('[defineRenderComponent] InnerComponent setup called')
                    return renderFn
                }
            }

            // 3. 使用 render() 获取 RenderNode
            const nodeInternal = render(InnerComponent)
            console.log('[defineRenderComponent] nodeInternal created')

            // 4. 创建响应式引用，供模板使用
            const node = ref(nodeInternal.value)
            console.log('[defineRenderComponent] node ref created')

            // 5. 监听 nodeInternal 变化，同步到 node
            watch(
                () => nodeInternal.value,
                (newVal: any) => {
                    console.log('[defineRenderComponent] nodeInternal changed, updating node')
                    node.value = newVal
                },
                { deep: true }
            )

            // 6. 返回 node 给模板使用
            return { node }
        }
    })
}
