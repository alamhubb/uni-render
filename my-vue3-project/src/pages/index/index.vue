<template>
  <div>
    <div>
      <a href="https://vite.dev" target="_blank">
        <img src="/static/vite.svg" class="logo" alt="Vite logo" />
      </a>
      <a href="https://vuejs.org/" target="_blank">
        <img src="/static/vue.svg" class="logo vue" alt="Vue logo" />
      </a>
    </div>
    <HelloWorld msg="Vite + Vue" />
    <div style="margin-top: 20px; text-align: center;">
      <p style="color: #42b883;">Hello UniApp Render!</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import HelloWorld from './components/HelloWorld.vue'
import './index.css'
</script>
