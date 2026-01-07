<template>
  <!-- 递归渲染 vnodeTree -->
  <template v-if="nodeToRender">
    <!-- view 容器 -->
    <view 
      v-if="nodeToRender.type === 'view'"
      :id="nodeToRender.props?.id"
      :class="[attrs.class, nodeToRender.props?.class]"
      :style="nodeToRender.props?.style"
      :data-id="nodeToRender.id"
      @tap="onTap"
    >
      <render-node v-for="(child, index) in nodeToRender.children" :key="child.id || index" :node="child" />
    </view>
    
    <!-- text 文本 -->
    <text 
      v-else-if="nodeToRender.type === 'text'"
      :id="nodeToRender.props?.id"
      :class="[attrs.class, nodeToRender.props?.class]"
      :style="nodeToRender.props?.style"
    >{{ nodeToRender.text }}<render-node v-for="(child, index) in nodeToRender.children" :key="child.id || index" :node="child" /></text>
    
    <!-- 纯文本节点 -->
    <text v-else-if="nodeToRender.type === '#text'" :class="attrs.class">{{ nodeToRender.text }}</text>
    
    <!-- button 按钮 -->
    <button 
      v-else-if="nodeToRender.type === 'button'"
      :id="nodeToRender.props?.id"
      :class="[attrs.class, nodeToRender.props?.class]"
      :style="nodeToRender.props?.style"
      :type="nodeToRender.props?.type || 'default'"
      :size="nodeToRender.props?.size || 'default'"
      :disabled="nodeToRender.props?.disabled"
      :data-id="nodeToRender.id"
      @tap="onTap"
    ><text v-if="nodeToRender.text">{{ nodeToRender.text }}</text><render-node v-for="(child, index) in nodeToRender.children" :key="child.id || index" :node="child" /></button>
    
    <!-- input 输入框 -->
    <input 
      v-else-if="nodeToRender.type === 'input'"
      :id="nodeToRender.props?.id"
      :class="[attrs.class, nodeToRender.props?.class]"
      :style="nodeToRender.props?.style"
      :type="nodeToRender.props?.type || 'text'"
      :value="nodeToRender.props?.value"
      :placeholder="nodeToRender.props?.placeholder"
      :disabled="nodeToRender.props?.disabled"
      :data-id="nodeToRender.id"
      @input="onInput"
    />
    
    <!-- image 图片 -->
    <image 
      v-else-if="nodeToRender.type === 'image'"
      :id="nodeToRender.props?.id"
      :class="[attrs.class, nodeToRender.props?.class]"
      :style="nodeToRender.props?.style"
      :src="nodeToRender.props?.src"
      :mode="nodeToRender.props?.mode || 'scaleToFill'"
      :data-id="nodeToRender.id"
      @tap="onTap"
    />
    
    <!-- 默认：当作 view 处理 -->
    <view 
      v-else
      :class="[attrs.class, nodeToRender.props?.class]"
      :style="nodeToRender.props?.style"
      :data-id="nodeToRender.id"
      @tap="onTap"
    >
      <render-node v-for="(child, index) in nodeToRender.children" :key="child.id || index" :node="child" />
    </view>
  </template>
</template>

<script lang="ts">
import { defineComponent, PropType, inject, computed, provide } from 'vue'
import { createMpEvent } from '../renderer/triggerEvent'
import { triggerEventById } from '../renderer/useRenderNode'
import type { MPNode } from '../renderer/serialize'

/**
 * RenderNode - 动态节点渲染组件
 * 
 * 职责：
 * 1. 接收 MPNode 数据（纯 JSON，可通过 setData 传递）
 * 2. 递归渲染为 UniApp 原生组件
 * 3. 事件触发时从全局对象获取处理器
 * 
 * 使用方式：
 * ```vue
 * <RenderNode :node="node" />
 * ```
 */
export default defineComponent({
  name: 'render-node',
  inheritAttrs: false,
  props: {
    // MPNode 节点数据（纯 JSON）
    node: {
      type: Object as PropType<MPNode | null>,
      default: null
    }
  },
  setup(props, { attrs }) {
    // 当前渲染的节点
    const nodeToRender = computed(() => props.node)
    
    // 从父组件注入 componentId（使用数字类型）
    const injectedComponentId = inject<number>('__componentId__', 0)
    
    // 计算当前有效的 componentId
    const componentId = computed(() => {
      // 优先使用节点自身的 componentId（根节点会有）
      const nodeComponentId = nodeToRender.value?.props?.__componentId__
      if (typeof nodeComponentId === 'number') return nodeComponentId
      // 其次使用注入的（子节点使用）
      return injectedComponentId
    })
    
    // 为子节点 provide componentId
    provide('__componentId__', componentId.value || injectedComponentId)

    /**
     * 统一事件处理函数
     * 从全局对象获取事件处理器
     */
    function handleEvent(e: any, eventType: string) {
      if (!nodeToRender.value?.props) return
      
      const bindKey = `bind${eventType}`
      const eventId = nodeToRender.value.props[bindKey]
      
      if (!eventId) return
      
      const mpEvent = createMpEvent(e, eventType)
      
      // 从全局对象获取并调用事件处理器
      const cid = componentId.value
      if (cid !== undefined && cid !== null) {
        triggerEventById(cid, eventId, mpEvent)
      }
    }

    function onTap(e: any) {
      handleEvent(e, 'tap')
    }

    function onInput(e: any) {
      handleEvent(e, 'input')
    }

    return {
      attrs,
      nodeToRender,
      onTap,
      onInput
    }
  }
})
</script>
