<script setup lang="ts">
import {ref} from 'vue'

const props = defineProps<{ msg: string }>()

const count = ref(0)
</script>

<template>
  <h1 style="font-size: 2em; color: #333;line-height: 1.1;font-weight: bold;">{{ msg }}</h1>

  <div style="margin-top: 2em; text-align: center;">
    <p style="color: #42b883;font-size: 2em">Hello uni-render</p>
  </div>

  <div class="card">
    <button type="button" @click="count++">count is {{ count }}</button>
    <p style="margin-top:1em">
      Edit
      <code>components/HelloWorld.vue</code> to test HMR
    </p>
  </div>

  <p style="display: flex;flex-direction: row;justify-content: center;margin-top:1em">
    Check out
    <a style="font-weight: 500;
    color: #646cff;margin-left:0.3em;
    text-decoration: inherit;" href="https://github.com/alamhubb/uni-render/tree/main/create-uni-render/template" target="_blank">create-vue</a>, the
    official Vue + Vite
    starter
  </p>
  <p style="display: flex;flex-direction: row;justify-content: center;margin-top:1em">
    Learn more about IDE Support for Vue in the
    <a style="font-weight: 500;
    color: #646cff;margin-left:0.3em;
    text-decoration: inherit;" href="https://github.com/alamhubb/uni-render" target="_blank">Vue
      Docs Scaling up Guide</a>.
  </p>
  <p class="read-the-docs">Click on the Vite and Vue logos to learn more</p>
</template>

<style scoped>
.read-the-docs {
  color: #888;
  margin-top: 1em;
}
</style>
