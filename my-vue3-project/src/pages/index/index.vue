<script lang="ts">
import { h, ref, defineComponent } from 'vue'
import HelloWorld from './components/HelloWorld.vue'

export default defineComponent({
  setup() {
    return () => h('view', {}, [
      // Logo 区域
      h('view', {}, [
        h('navigator', { url: 'https://vite.dev', class: 'logo-link' }, [
          h('image', { src: '/static/vite.svg', class: 'logo' })
        ]),
        h('navigator', { url: 'https://vuejs.org/', class: 'logo-link' }, [
          h('image', { src: '/static/vue.svg', class: 'logo vue' })
        ])
          ,123
      ]),
      // HelloWorld 组件
      h(HelloWorld, { msg: 'Vite + Vue' })
    ])
  }
})
</script>

<style scoped>
.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}
</style>
