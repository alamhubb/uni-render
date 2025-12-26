<template>
  <document @mounted="handleDocumentMounted" />
</template>
<script lang="ts" setup>
import {
  VueRender,
  vueRenderContext,
  DocumentComponentInstance,
} from './src/renderer/context'
import { h, VNode, Fragment } from 'vue'
import { getCurrentInstance, provide, shallowRef } from 'vue'

// #ifdef H5 || APP
import document from './document.vue'
// #endif

const $emit = defineEmits<{
  (e: 'mounted', render: VueRender): void
}>()

const $vm = getCurrentInstance()
const documentInstanceRef = shallowRef<DocumentComponentInstance | null>(null)
const renderInstanceRef = shallowRef<VueRender | null>(null)

// 用于存储渲染的 VNode
const vnodeMap = new Map<number, VNode>()
let vnodeId = 0

const uid = () => ++vnodeId

const handleDocumentMounted = (event: any) => {
  documentInstanceRef.value = event.detail as DocumentComponentInstance

  const vueRender: VueRender = {
    $documentInstance: event.detail,
    $vm,
    render: (vnode: VNode) => {
      const id = uid()
      vnodeMap.set(id, vnode)
      updateRender()
      return id
    },
    update: (id: number, vnode: VNode) => {
      vnodeMap.set(id, vnode)
      updateRender()
      return id
    },
    unmount: (id: number) => {
      vnodeMap.delete(id)
      updateRender()
    },
  }

  const updateRender = () => {
    const vnodes = Array.from(vnodeMap.values())
    const container = h(Fragment, null, vnodes)
    documentInstanceRef.value?.vueRender.render(container)
  }

  renderInstanceRef.value = vueRender
  $emit('mounted', vueRender)
}

provide(vueRenderContext, renderInstanceRef)

defineExpose({
  document: documentInstanceRef,
  render: renderInstanceRef,
})
</script>
