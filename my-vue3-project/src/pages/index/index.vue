<script lang="ts">
import { defineComponent, h } from 'vue'

// 使用官方 Vue 的渲染函数，但用 UniApp 的组件标签
export default defineComponent({
  name: 'IndexPage',
  setup() {
    // 直接返回渲染函数，使用 UniApp 组件
    return () => h('view', {}, [
      h('view', {}, [
        h('view', {}, [
          h('image', {
            src: '/static/vite.svg',
            class: 'logo',
            mode: 'scaleToFill'
          })
        ]),
        h('view', {}, [
          h('image', {
            src: '/static/vue.svg',
            class: 'logo vue',
            mode: 'scaleToFill'
          })
        ])
      ]),
      h('view', { style: 'margin-top: 20px; text-align: center;' }, [
        h('text', { style: 'color: #42b883;' }, 'Hello UniApp Render!')
      ])
    ])
  }
})
</script>

<style>
.logo {
  width: 100px;
  height: 100px;
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
