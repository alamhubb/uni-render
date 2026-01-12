<script setup lang="ts">
import {ref} from 'vue'

const props = defineProps<{ msg: string }>()

const count = ref(0)
</script>

<template>
  <h1 style="font-size: 2em; color: #333;line-height: 1.1;font-weight: bold;">{{ msg }}</h1>

  <div style="margin-top: 2em; text-align: center;">
    <p style="color: #42b883;">Hello uni-render</p>
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
    text-decoration: inherit;" href="https://vuejs.org/guide/quick-start.html#local" target="_blank">create-vue</a>, the
    official Vue + Vite
    starter
  </p>
  <p style="display: flex;flex-direction: row;justify-content: center;margin-top:1em">
    Learn more about IDE Support for Vue in the
    <a style="font-weight: 500;
    color: #646cff;margin-left:0.3em;
    text-decoration: inherit;" href="https://vuejs.org/guide/scaling-up/tooling.html#ide-support" target="_blank">Vue
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
