<script lang="ts">
import { h, defineComponent } from 'vue'
import HelloWorld from './components/HelloWorld.vue'

export default defineComponent({
  setup() {
    return () => h('view', { class: 'container' }, [
      // UniApp Logo
      h('image', {
        class: 'logo',
        src: '/static/logo.png'
      }),
      // HelloWorld 组件 - 直接使用导入的组件
      h(HelloWorld, { msg: 'UniApp + Render' })
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
