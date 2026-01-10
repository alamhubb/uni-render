/**
 * defineRenderComponent - 本地测试版
 * 
 * 简单包装：创建 InnerComponent + 调用 render()
 */

import { render } from 'uniapp-render'

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
                // 创建一个代理上下文，包含 setup 返回的数据
                return () => {
                    const _ctx = { ...setupResult }
                    return originalRender.call(_ctx, _ctx, [])
                }
            }

            // 都没有，返回空渲染函数
            console.warn('[defineRenderComponent] 组件既没有返回渲染函数，也没有 render 属性')
            return () => null
        }
    }

    console.log('[defineRenderComponent] 开始调用 render()')

    // 调用 Custom Renderer 的 render()
    const { node, unmount } = render(InnerComponent)

    console.log('[defineRenderComponent] render 完成，node:', node.value)

    // 返回渲染结果
    return { node, unmount }
}
