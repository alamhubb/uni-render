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
import { watch, type Component } from '@vue/runtime-core'
import { ref as vueRef, defineComponent, onUnmounted } from 'vue'
import { render } from './render'

/**
 * 定义一个渲染函数组件
 *
 * 支持两种格式：
 * 1. 标准 Vue 组件格式（有 setup 和 render 属性）
 * 2. 渲染函数选项格式（setup 返回渲染函数）
 *
 * @example 标准 Vue 组件格式
 * ```typescript
 * const MyComponent = {
 *   setup() { return { count } },
 *   render() { return h('div', {}, count.value) }
 * }
 * export default defineRenderComponent(MyComponent)
 * ```
 *
 * @example 渲染函数选项格式
 * ```typescript
 * export default defineRenderComponent({
 *   setup() {
 *     const count = ref(0)
 *     return () => h('view', {}, `计数: ${count.value}`)
 *   }
 * })
 * ```
 */
export function defineRenderComponent(component: Component) {
    // 暂时直接返回组件，不做任何处理（调试模式）
    return component as any

    // 原始逻辑（使用 Custom Renderer）：
    // const componentProps = (component as any).props
    // const originalSetup = (component as any).setup
    // const originalRender = (component as any).render
    //
    // return defineComponent({
    //     name: (component as any).name,
    //     props: componentProps,
    //     setup(props: any, ctx: any) {
    //         console.log('[defineRenderComponent] 开始处理组件')
    //         console.log('[defineRenderComponent] 有 setup:', !!originalSetup)
    //         console.log('[defineRenderComponent] 有 render:', !!originalRender)
    //
    //         // 创建一个包装组件，让 setup 返回渲染函数
    //         const InnerComponent: Component = {
    //             setup() {
    //                 // 如果原始组件有 setup，先执行它获取上下文
    //                 let setupResult: any = {}
    //                 if (originalSetup) {
    //                     setupResult = originalSetup(props, ctx)
    //                 }
    //
    //                 // 如果 setup 返回的是函数，直接使用
    //                 if (typeof setupResult === 'function') {
    //                     return setupResult
    //                 }
    //
    //                 // 如果有单独的 render 属性，使用它
    //                 if (originalRender) {
    //                     // 创建一个代理上下文，包含 setup 返回的数据
    //                     return () => {
    //                         const _ctx = { ...setupResult }
    //                         return originalRender.call(_ctx, _ctx, [])
    //                     }
    //                 }
    //
    //                 // 都没有，返回空渲染函数
    //                 console.warn('[defineRenderComponent] 组件既没有返回渲染函数，也没有 render 属性')
    //                 return () => null
    //             }
    //         }
    //
    //         console.log('[defineRenderComponent] 创建内部组件完成，开始 render')
    //
    //         // 直接把内部组件传给 render()
    //         const { node: nodeInternal, unmount } = render(InnerComponent)
    //
    //         console.log('[defineRenderComponent] render 完成，nodeInternal:', nodeInternal.value)
    //
    //         // 创建响应式引用，供模板使用
    //         const node = vueRef(nodeInternal.value)
    //
    //         // 监听 nodeInternal 变化，同步到 node
    //         watch(
    //             () => nodeInternal.value,
    //             (newVal: any) => {
    //                 console.log('[defineRenderComponent] node 更新:', newVal)
    //                 node.value = newVal
    //             },
    //             { deep: true }
    //         )
    //
    //         // 组件卸载时清理资源
    //         onUnmounted(() => {
    //             unmount()
    //         })
    //
    //         // 返回 node 给模板使用
    //         return { node }
    //     }
    // })
}
