<template>
  <render-component :node="node" />
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue'
import { h } from 'uniapp-render'

// 手动编写渲染函数组件
const MyComponent = defineComponent({
  setup() {
    // 返回渲染函数
    return () => h('div', {}, [
      h('div', {}, [
        h('a', { href: 'https://vite.dev', target: '_blank' }, [
          h('img', { src: '/static/vite.svg', class: 'logo', alt: 'Vite logo' })
        ]),
        h('a', { href: 'https://vuejs.org/', target: '_blank' }, [
          h('img', { src: '/static/vue.svg', class: 'logo vue', alt: 'Vue logo' })
        ])
      ]),
      h('div', { style: 'margin-top: 20px; text-align: center;' }, [
        h('p', { style: 'color: #42b883;' }, 'Hello UniApp Render!')
      ])
    ])
  }
})

// 使用 defineRenderComponent 包装
import { defineRenderComponent } from '@/unirender'
export default defineRenderComponent(MyComponent)
</script>

<style>
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
