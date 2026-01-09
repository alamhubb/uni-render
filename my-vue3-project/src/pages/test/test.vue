<script lang="ts">
/**
 * 测试页面 - 使用 vite 插件自动转换
 */
import { defineComponent, h, ref } from 'vue'

export default defineComponent({
  setup() {
    const count = ref(0)
    return () => h('view', { class: 'test-container' }, [
      h('text', { class: 'title' }, '测试页面（插件模式）'),
      h('text', {}, `计数: ${count.value}`),
      h('button', {
        class: 'btn',
        onClick: () => count.value++
      }, '点击 +1')
    ])
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
