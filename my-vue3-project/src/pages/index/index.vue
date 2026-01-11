<template>
  <render-component :node="node"></render-component>
</template>

<script lang="ts">
import { defineComponent, h } from '@/unirender'
import './index.css'
import { defineRenderComponent } from '@/unirender'
import HelloWorld from './components/HelloWorld.vue'

// 定义组件
const MyComponent = defineComponent({
  setup() {
    return () => h('div', {}, [
      h('div', {}, [
        h('a', { href: 'https://vite.dev', target: '_blank' }, [
          h('img', { src: '/static/vite.svg', class: 'logo', alt: 'Vite logo' })
        ]),
        h('a', { href: 'https://vuejs.org/', target: '_blank' }, [
          h('img', { src: '/static/vue.svg', class: 'logo vue', alt: 'Vue logo' })
        ])
      ]),
      h(HelloWorld, { msg: 'Vite + Vue' }),
      h('div', { style: 'margin-top: 20px; text-align: center;' }, [
        h('p', { style: 'color: #42b883;' }, 'Hello UniApp Render!')
      ])
    ])
  }
})

// 使用 defineRenderComponent 包装
export default defineRenderComponent(MyComponent)
</script>
