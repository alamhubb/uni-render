/**
 * defineRenderComponent - 本地测试版
 * 
 * 返回一个 Vue 组件，setup 返回 { node }
 */

import { render } from './render'
import { watch } from '@vue/runtime-core'
import { ref as vueRef, onUnmounted } from '@dcloudio/uni-h5-vue'

console.log('[defineRenderComponent.ts] 本地版本已加载！')

export function defineRenderComponent(component: any) {
    console.log('[defineRenderComponent] 收到组件:', component)

    const originalSetup = component?.setup
    const originalRender = component?.render

    console.log('[defineRenderComponent] 有 setup:', !!originalSetup)
    console.log('[defineRenderComponent] 有 render:', !!originalRender)

    // 创建一个包装组件，让 setup 返回渲染函数
    const InnerComponent = {
        setup(props: any, ctx: any) {
            // 如果原始组件有 setup，先执行它获取上下文
            let setupResult: any = {}
            if (originalSetup) {
                setupResult = originalSetup(props, ctx)
            }

            // 如果 setup 返回的是函数，直接使用
            if (typeof setupResult === 'function') {
                console.log('[defineRenderComponent] setup 返回了渲染函数')
                return setupResult
            }

            // 如果有单独的 render 属性，使用它
            if (originalRender) {
                console.log('[defineRenderComponent] 使用单独的 render 属性')
                return () => {
                    const _ctx = { ...setupResult }
                    const vnode = originalRender.call(_ctx, _ctx, [])
                    console.log('[defineRenderComponent] render 返回的 VNode:', vnode)
                    console.log('[defineRenderComponent] VNode.children:', vnode?.children)
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
            console.log('[defineRenderComponent] 开始调用 render()')

            // 调用 Custom Renderer 的 render()
            const { node: nodeInternal, unmount } = render(InnerComponent)

            console.log('[defineRenderComponent] render 完成，node:', nodeInternal.value)
            console.log('[defineRenderComponent] node.type:', nodeInternal.value?.type)
            console.log('[defineRenderComponent] node.children:', nodeInternal.value?.children)

            // 创建响应式 node
            const node = vueRef(nodeInternal.value)

            // 监听 nodeInternal 变化，同步到 node
            watch(
                () => nodeInternal.value,
                (newVal) => {
                    console.log('[defineRenderComponent] node 更新:', newVal)
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
