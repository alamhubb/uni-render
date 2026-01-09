<template>
  <render-component :node="node" />
</template>

<script lang="ts">
/**
 * 手写测试页面 - 不使用 vite 插件转换
 * 直接内联 defineRenderComponent 的逻辑
 */
import {defineRenderComponent, h, ref} from 'uniapp-render'

// ========================================
// 直接内联 defineRenderComponent 的逻辑
// ========================================
export default defineRenderComponent({
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
