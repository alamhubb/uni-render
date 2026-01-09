<script lang="ts">
import { h, defineComponent, resolveComponent } from 'vue'

export default defineComponent({
  setup() {
    return () => h('view', { class: 'container' }, [
      // UniApp Logo
      h('image', {
        class: 'logo',
        src: '/static/logo.png'
      }),
      // HelloWorld 组件
      h(resolveComponent('HelloWorld'), { msg: 'UniApp + Render' })
    ])
  }
})
</script>

<style scoped>
.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
}

.logo {
  width: 100px;
  height: 100px;
  margin-bottom: 20px;
}
</style>
