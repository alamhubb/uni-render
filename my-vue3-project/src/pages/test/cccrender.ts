import {ref as vueRef, defineComponent} from 'vue'
import {render} from 'uniapp-render'
import {watch} from '@vue/runtime-core'

export function renddd(obj:any) {

// ========================================
// 直接内联 defineRenderComponent 的逻辑
// ========================================
    return defineComponent({
        setup() {
            // 3. 使用 render() 获取 RenderNode
            const nodeInternal = render(obj)
            console.log('[手写测试] nodeInternal created:', nodeInternal.value)

            // 4. 创建响应式引用，供模板使用
            const node = vueRef(nodeInternal.value)
            console.log('[手写测试] node ref created:', node.value)

            // 5. 监听 nodeInternal 变化，同步到 node
            watch(
                () => nodeInternal.value,
                (newVal: any) => {
                    console.log('[手写测试] nodeInternal changed, updating node')
                    node.value = newVal
                },
                {deep: true}
            )

            // 6. 返回 node 给模板使用
            console.log('[手写测试] returning { node }')
            return {node}
        }
    })
}