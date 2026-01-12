/**
 * defineRenderComponent - 本地测试版
 * 
 * 返回一个 Vue 组件，setup 返回 { node }
 */

import { render } from './render'
import { watch } from '@vue/runtime-core'
import { ref as vueRef, onUnmounted } from 'vue'

export function defineRenderComponent(component: any) {
    const originalSetup = component?.setup
    const originalRender = component?.render

    // 创建一个包装组件，让 setup 返回渲染函数
    const InnerComponent = {
        // 继承原始组件的 props 定义
        props: component?.props,

        setup(props: any, ctx: any) {
            console.log('[defineRenderComponent] InnerComponent setup 被调用')
            console.log('[defineRenderComponent] 原始组件 props 定义:', component?.props)
            console.log('[defineRenderComponent] 接收到的 props:', props)

            // 如果原始组件有 setup，先执行它获取上下文
            let setupResult: any = {}
            if (originalSetup) {
                setupResult = originalSetup(props, ctx)
                console.log('[defineRenderComponent] originalSetup 返回:', setupResult)
            }

            // 如果 setup 返回的是函数，直接使用
            if (typeof setupResult === 'function') {
                console.log('[defineRenderComponent] setup 返回的是渲染函数')
                return setupResult
            }

            // 如果有单独的 render 属性，使用它
            if (originalRender) {
                console.log('[defineRenderComponent] 使用 originalRender')
                return () => {
                    // render 函数签名: render(_ctx, _cache, $props, $setup, $data, $options)
                    console.log('[defineRenderComponent] 调用 render，$props:', props)
                    const vnode = originalRender(
                        setupResult,  // _ctx
                        [],           // _cache
                        props,        // $props
                        setupResult,  // $setup
                        {},           // $data
                        {}            // $options
                    )
                    console.log('[defineRenderComponent] render 返回的 vnode:', vnode)
                    return vnode
                }
            }

            console.warn('[defineRenderComponent] 组件既没有返回渲染函数，也没有 render 属性')
            return () => null
        }
    }

    // 返回一个 Vue 组件，setup 返回 { node }
    return {
        setup() {
            // 调用 Custom Renderer 的 render()
            const { node: nodeInternal, unmount } = render(InnerComponent)

            // 创建响应式 node
            const node = vueRef(nodeInternal.value)

            // 监听 nodeInternal 变化，同步到 node
            watch(
                () => nodeInternal.value,
                (newVal) => {
                    node.value = newVal
                },
                { deep: true }
            )

            // 组件卸载时清理
            onUnmounted(() => {
                unmount()
            })

            // 返回 node 给模板使用
            return { node }
        }
    }
}
