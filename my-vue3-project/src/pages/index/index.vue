<template>
  <div>
    <div style="display: flex;flex-direction: row;justify-content: center">
      <a href="https://uniapp.dcloud.net.cn/" target="_blank">
        <img src="/static/logo.png" class="logo" alt="Uniapp logo" />
      </a>
      <a href="https://github.com/alamhubb/uni-render" target="_blank">
        <img src="/static/renderlogo.png" class="render logo" alt="UniRender logo" />
      </a>
    </div>
    <HelloWorld msg="Uniapp + Render" />
  </div>
</template>

<script setup lang="ts">
import HelloWorld from './components/HelloWorld.vue'
</script>
<style>
.logo {
  height: 6em;
  width: 6em;
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