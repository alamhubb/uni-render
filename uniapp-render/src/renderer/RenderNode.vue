<template>
  <!-- 递归渲染 vnodeTree -->
  <template v-if="nodeToRender">
    <!-- view 容器 -->
    <view 
      v-if="nodeToRender.type === 'view'"
      :id="nodeToRender.props?.id"
      :class="nodeToRender.props?.class"
      :style="nodeToRender.props?.style"
      :data-id="nodeToRender.id"
      @tap="onTap"
    >
      <RenderNode v-for="(child, index) in nodeToRender.children" :key="child.id || index" :node="child" />
    </view>
    
    <!-- text 文本 -->
    <text 
      v-else-if="nodeToRender.type === 'text'"
      :id="nodeToRender.props?.id"
      :class="nodeToRender.props?.class"
      :style="nodeToRender.props?.style"
    >{{ nodeToRender.text }}<RenderNode v-for="(child, index) in nodeToRender.children" :key="child.id || index" :node="child" /></text>
    
    <!-- 纯文本节点 -->
    <text v-else-if="nodeToRender.type === '#text'">{{ nodeToRender.text }}</text>
    
    <!-- button 按钮 -->
    <button 
      v-else-if="nodeToRender.type === 'button'"
      :id="nodeToRender.props?.id"
      :class="nodeToRender.props?.class"
      :style="nodeToRender.props?.style"
      :type="nodeToRender.props?.type || 'default'"
      :size="nodeToRender.props?.size || 'default'"
      :disabled="nodeToRender.props?.disabled"
      :data-id="nodeToRender.id"
      @tap="onTap"
    ><text v-if="nodeToRender.text">{{ nodeToRender.text }}</text><RenderNode v-for="(child, index) in nodeToRender.children" :key="child.id || index" :node="child" /></button>
    
    <!-- input 输入框 -->
    <input 
      v-else-if="nodeToRender.type === 'input'"
      :id="nodeToRender.props?.id"
      :class="nodeToRender.props?.class"
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
      :class="nodeToRender.props?.class"
      :style="nodeToRender.props?.style"
      :src="nodeToRender.props?.src"
      :mode="nodeToRender.props?.mode || 'scaleToFill'"
      :data-id="nodeToRender.id"
      @tap="onTap"
    />
    
    <!-- 默认：当作 view 处理 -->
    <view 
      v-else
      :class="nodeToRender.props?.class"
      :style="nodeToRender.props?.style"
      :data-id="nodeToRender.id"
      @tap="onTap"
    >
      <RenderNode v-for="(child, index) in nodeToRender.children" :key="child.id || index" :node="child" />
    </view>
  </template>
</template>

<script lang="ts">
import { defineComponent, PropType, inject, ref, computed, watchEffect, getCurrentInstance, provide, onUnmounted } from 'vue'
import type { VNode } from 'vue'
import { triggerEvent, createMpEvent } from './triggerEvent'
import { vnodeToMPNode, createConvertContext } from './converter'
import { getEventHandlers, cleanupEventHandlers, getComponentEventMap } from './useVnodeTree'
import type { MPNode } from './serialize'

export default defineComponent({
  name: 'RenderNode',
  props: {
    // 方式1：直接传入 MPNode（原有方式，用于递归渲染子节点）
    node: {
      type: Object as PropType<MPNode | null>,
      default: null
    },
    // 方式2：传入 render 函数（新方式，自动处理响应式）
    render: {
      type: Function as PropType<() => VNode>,
      default: null
    }
  },
  setup(props) {
    const instance = getCurrentInstance()
    
    // 如果传入了 render 函数，自动处理响应式
    const convertedNode = ref<MPNode | null>(null)
    let componentId: number | null = null
    
    if (props.render) {
      // 根组件：创建事件 Map 和处理响应式
      componentId = instance?.uid ?? 0
      provide('__componentId__', componentId)
      
      // 获取或创建事件 Map
      const eventHandlers = getComponentEventMap(componentId)
      
      watchEffect(() => {
        // 每次渲染前清空事件（复用 eventId）
        eventHandlers.clear()
        
        // 创建转换上下文
        const ctx = createConvertContext(eventHandlers)
        
        // 调用 render 函数（在 watchEffect 内，自动追踪响应式）
        const vnode = props.render!()
        
        // 转换为 MPNode
        convertedNode.value = vnodeToMPNode(vnode, ctx)
      })
      
      onUnmounted(() => {
        if (componentId !== null) {
          cleanupEventHandlers(componentId)
        }
      })
    }
    
    // 最终渲染的节点：优先使用 node prop，其次使用转换后的节点
    const nodeToRender = computed(() => props.node || convertedNode.value)
    
    // 获取组件 ID（可能是自己的，也可能是父组件 provide 的）
    const injectedComponentId = inject<number>('__componentId__', 0)
    const effectiveComponentId = computed(() => componentId ?? injectedComponentId)

    /**
     * 统一事件处理函数
     */
    function handleEvent(e: any, eventType: string) {
      if (!nodeToRender.value?.props) return
      
      const bindKey = `bind${eventType}`
      const eventId = nodeToRender.value.props[bindKey]
      
      if (!eventId) return
      
      const mpEvent = createMpEvent(e, eventType)
      triggerEvent(effectiveComponentId.value, eventId, mpEvent)
    }

    function onTap(e: any) {
      handleEvent(e, 'tap')
    }

    function onInput(e: any) {
      handleEvent(e, 'input')
    }

    return {
      nodeToRender,
      onTap,
      onInput
    }
  }
})
</script>
