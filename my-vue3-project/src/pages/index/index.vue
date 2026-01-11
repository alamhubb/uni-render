<script setup lang="ts">
// 暂时不使用响应式
</script>

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
    
    <div style="margin-top: 20px; text-align: center;">
      <p style="color: #42b883;">Hello UniApp Render!</p>
    </div>
  </div>
</template>

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
