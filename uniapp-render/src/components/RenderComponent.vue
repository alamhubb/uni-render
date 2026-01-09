<template>
  <!-- 递归渲染 RenderNode -->
  <template v-if="nodeToRender">
    <!-- view 容器 -->
    <view v-if="nodeToRender.type === 'view'" :id="nodeToRender.props?.id"
      :class="[attrs.class, nodeToRender.props?.class]" :style="nodeToRender.props?.style" :data-id="nodeToRender.id"
      @tap="onTap" @longpress="onLongPress">
      <text v-if="nodeToRender.text">{{ nodeToRender.text }}</text>
      <render-component v-for="(child, index) in nodeToRender.children" :key="child.id || index" :node="child" />
    </view>

    <!-- text 文本 -->
    <text v-else-if="nodeToRender.type === 'text'" :id="nodeToRender.props?.id"
      :class="[attrs.class, nodeToRender.props?.class]" :style="nodeToRender.props?.style" @tap="onTap">{{
        nodeToRender.text }}<render-component v-for="(child, index) in nodeToRender.children" :key="child.id || index"
        :node="child" /></text>

    <!-- 纯文本节点 -->
    <text v-else-if="nodeToRender.type === '#text'" :class="attrs.class">{{ nodeToRender.text }}</text>

    <!-- button 按钮 - 使用 view 包装以确保事件触发 -->
    <view v-else-if="nodeToRender.type === 'button'" :id="nodeToRender.props?.id"
      :class="[attrs.class, nodeToRender.props?.class, 'uni-btn']" :style="nodeToRender.props?.style"
      :data-id="nodeToRender.id" @tap="onTap">
      <text v-if="nodeToRender.text">{{ nodeToRender.text }}</text>
      <render-component v-for="(child, index) in nodeToRender.children" :key="child.id || index" :node="child" />
    </view>

    <!-- input 输入框 -->
    <input v-else-if="nodeToRender.type === 'input'" :id="nodeToRender.props?.id"
      :class="[attrs.class, nodeToRender.props?.class]" :style="nodeToRender.props?.style"
      :type="nodeToRender.props?.type || 'text'" :value="nodeToRender.props?.value"
      :placeholder="nodeToRender.props?.placeholder" :disabled="nodeToRender.props?.disabled" :data-id="nodeToRender.id"
      @input="onInput" @focus="onFocus" @blur="onBlur" />

    <!-- image 图片 -->
    <image v-else-if="nodeToRender.type === 'image'" :id="nodeToRender.props?.id"
      :class="[attrs.class, nodeToRender.props?.class]" :style="nodeToRender.props?.style"
      :src="nodeToRender.props?.src" :mode="nodeToRender.props?.mode || 'scaleToFill'" :data-id="nodeToRender.id"
      @tap="onTap" />

    <!-- 默认：当作 view 处理 -->
    <view v-else :class="[attrs.class, nodeToRender.props?.class]" :style="nodeToRender.props?.style"
      :data-id="nodeToRender.id" @tap="onTap">
      <render-component v-for="(child, index) in nodeToRender.children" :key="child.id || index" :node="child" />
    </view>
  </template>
</template>

<script lang="ts">
import { defineComponent, PropType, computed } from 'vue'
import { renderEvent } from '../renderer/event'
import type { RenderNode } from '../renderer/types'

/**
 * RenderComponent - 动态节点渲染组件
 * 
 * 职责：
 * 1. 接收 RenderNode 数据（纯 JSON，可通过 setData 传递）
 * 2. 递归渲染为 UniApp 原生组件
 * 3. 事件触发时调用 renderEvent
 */
export default defineComponent({
  name: 'render-component',
  inheritAttrs: false,
  props: {
    node: {
      type: Object as PropType<RenderNode | null>,
      default: null
    }
  },
  setup(props, { attrs }) {
    const nodeToRender = computed(() => props.node)

    /**
     * 统一事件处理函数
     */
    function handleEvent(e: any, eventType: string) {
      console.log('[handleEvent] called', { eventType, hasProps: !!nodeToRender.value?.props })

      if (!nodeToRender.value?.props) {
        console.warn('[handleEvent] ⚠️ nodeToRender.value.props is null')
        return
      }

      // 从 data-eid-{eventType} 获取事件 ID
      const eventId = nodeToRender.value.props[`data-eid-${eventType}`]
      console.log('[handleEvent] eventId:', eventId, typeof eventId)

      if (!eventId || typeof eventId !== 'string') {
        // 没有 eventId 可能是事件冒泡到父级元素，静默返回
        return
      }

      // 使用新的事件系统
      console.log('[handleEvent] calling renderEvent with', eventId)
      renderEvent(eventId, e)
    }

    function onTap(e: any) {
      console.log('[RenderComponent] onTap called', {
        nodeId: nodeToRender.value?.id,
        nodeType: nodeToRender.value?.type,
        props: nodeToRender.value?.props,
        hasEid: nodeToRender.value?.props?.['data-eid-tap']
      })
      handleEvent(e, 'tap')
    }

    function onLongPress(e: any) {
      handleEvent(e, 'longpress')
    }

    function onInput(e: any) {
      handleEvent(e, 'input')
    }

    function onFocus(e: any) {
      handleEvent(e, 'focus')
    }

    function onBlur(e: any) {
      handleEvent(e, 'blur')
    }

    return {
      attrs,
      nodeToRender,
      onTap,
      onLongPress,
      onInput,
      onFocus,
      onBlur
    }
  }
})
</script>
