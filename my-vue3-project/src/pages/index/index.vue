<template>
  <div>
    <div style="display: flex;flex-direction: row;justify-content: center">
      <a href="https://uniapp.dcloud.net.cn/" target="_blank">
        <img src="/static/logo.png" class="logo" alt="Uniapp logo" />
      </a>
      <a href="https://github.com/alamhubb/uni-render" target="_blank">
        <img src="/static/vue.svg" class="logo vue" alt="UniRender logo" />
      </a>
    </div>
    <HelloWorld msg="Uniapp + Render" />
  </div>
</template>

<script setup lang="ts">
import HelloWorld from './components/HelloWorld.vue'
import './index.css'
</script>
