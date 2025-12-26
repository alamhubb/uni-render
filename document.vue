<template>
  <!-- #ifdef APP -->
  <view ref="vueRenderRoot" mp />
  <!-- #endif -->
  <!-- #ifdef H5 -->
  <div ref="vueRenderRoot" mp></div>
  <!-- #endif -->
</template>
<script lang="ts" setup>
import { getCurrentInstance, onMounted, onBeforeUnmount, ref, VNode } from 'vue'
import { render } from './src/renderer'

const vueRenderRoot = ref<HTMLDivElement>()

const $emit = defineEmits<{
  (event: 'mounted', instance: any): void
}>()

const instance = getCurrentInstance()

// @ts-ignore
const proxy = instance.ctx

onMounted(() => {
  proxy.vueRender = {
    render(vnode: VNode) {
      return render(vnode, vueRenderRoot.value)
    },
  }

  proxy.rootElement = vueRenderRoot.value

  $emit('mounted', { detail: proxy })
})

onBeforeUnmount(() => {
  render(null, vueRenderRoot.value)
})

defineExpose(proxy)
</script>
<style>
:global(vue-proxy),
:global(mp-slot),
:global(app-slot),
:global([mp]) {
  display: contents !important;
}

:global(vue-proxy::before),
:global(mp-slot::before),
:global(app-slot::before),
:global([mp]::before),
:global(vue-proxy::after),
:global(mp-slot::after),
:global(app-slot::after),
:global([mp]::after) {
  display: none !important;
}

/* #ifdef APP  */
:global(app-shadow-dom),
:global(app-fragment) {
  display: none !important;
}
/* #endif */
</style>
