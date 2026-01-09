<template>
  <render-component :node="node" />
</template>

<script lang="ts">
/**
 * 手写测试页面 - 不使用 vite 插件转换
 * 直接内联 defineRenderComponent 的逻辑
 */
import { h, ref, defineComponent } from 'vue'
import { render } from 'uniapp-render'
import type { Component } from '@vue/runtime-core'
import { watch } from '@vue/runtime-core'

// ========================================
// 直接内联 defineRenderComponent 的逻辑
// ========================================
export default defineComponent({
  setup() {
    console.log('[手写测试] setup called')

    // ========== 用户的 setup 逻辑 ==========
    const count = ref(0)
    const userRenderFn = () => h('view', { class: 'test-container' }, [
      h('text', { class: 'title' }, '手写测试页面'),
      h('text', {}, `计数: ${count.value}`),
      h('button', { 
        class: 'btn',
        onClick: () => count.value++ 
      }, '点击 +1')
    ])
    // ========================================

    console.log('[手写测试] got userRenderFn')

    // 2. 包装为组件
    const InnerComponent: Component = {
      setup() {
        console.log('[手写测试] InnerComponent setup called')
        return userRenderFn
      }
    }

    // 3. 使用 render() 获取 RenderNode
    const nodeInternal = render(InnerComponent)
    console.log('[手写测试] nodeInternal created:', nodeInternal.value)

    // 4. 创建响应式引用，供模板使用
    const node = ref(nodeInternal.value)
    console.log('[手写测试] node ref created:', node.value)

    // 5. 监听 nodeInternal 变化，同步到 node
    watch(
      () => nodeInternal.value,
      (newVal: any) => {
        console.log('[手写测试] nodeInternal changed, updating node')
        node.value = newVal
      },
      { deep: true }
    )

    // 6. 返回 node 给模板使用
    console.log('[手写测试] returning { node }')
    return { node }
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
