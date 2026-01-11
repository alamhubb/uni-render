<template>
  <render-component :node="node" />
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue'
import { h } from 'uniapp-render'
import './index.css'
import HelloWorld from './components/HelloWorld'

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
      // 使用 HelloWorld 组件
      h(HelloWorld, { msg: 'Vite + Vue' }),
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
