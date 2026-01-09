<template>
  <render-component :node="node" />
</template>

<script lang="ts">
/**
 * 手写测试页面 - 不使用 vite 插件转换
 * 直接内联 defineRenderComponent 的逻辑
 */
import { h, ref } from 'uniapp-render'
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

// ========================================
// 直接内联 defineRenderComponent 的逻辑
// ========================================
export default renddd({
  setup() {
    console.log('[手写测试] setup called')

    // ========== 用户的 setup 逻辑 ==========
    const count = ref(0)
    return () => h('view', { class: 'test-container' }, [
      h('text', { class: 'title' }, '手写测试页面'),
      h('text', {}, `计数: ${count.value}`),
      h('button', {
        class: 'btn',
        onClick: () => count.value++
      }, '点击 +1')
    ])
    // ========================================
  }
})
</script>

<style scoped>
.test-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px;
  gap: 20px;
}

.title {
  font-size: 24px;
  font-weight: bold;
  color: #333;
}

.btn {
  padding: 12px 24px;
  font-size: 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
}
</style>
