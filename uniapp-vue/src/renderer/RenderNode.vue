<template>
  <!-- 递归渲染 vnodeTree -->
  <template v-if="node">
    <!-- view 容器 -->
    <view 
      v-if="node.type === 'view'"
      :id="node.props?.id"
      :class="node.props?.class"
      :style="node.props?.style"
      :data-id="node.id"
      @tap="onTap"
    >
      <RenderNode v-for="(child, index) in node.children" :key="child.id || index" :node="child" />
    </view>
    
    <!-- text 文本 -->
    <text 
      v-else-if="node.type === 'text'"
      :id="node.props?.id"
      :class="node.props?.class"
      :style="node.props?.style"
    >{{ node.text }}<RenderNode v-for="(child, index) in node.children" :key="child.id || index" :node="child" /></text>
    
    <!-- 纯文本节点 -->
    <text v-else-if="node.type === '#text'">{{ node.text }}</text>
    
    <!-- button 按钮 -->
    <button 
      v-else-if="node.type === 'button'"
      :id="node.props?.id"
      :class="node.props?.class"
      :style="node.props?.style"
      :type="node.props?.type || 'default'"
      :size="node.props?.size || 'default'"
      :disabled="node.props?.disabled"
      :data-id="node.id"
      @tap="onTap"
    ><text v-if="node.text">{{ node.text }}</text><RenderNode v-for="(child, index) in node.children" :key="child.id || index" :node="child" /></button>
    
    <!-- input 输入框 -->
    <input 
      v-else-if="node.type === 'input'"
      :id="node.props?.id"
      :class="node.props?.class"
      :style="node.props?.style"
      :type="node.props?.type || 'text'"
      :value="node.props?.value"
      :placeholder="node.props?.placeholder"
      :disabled="node.props?.disabled"
      :data-id="node.id"
      @input="onInput"
    />
    
    <!-- image 图片 -->
    <image 
      v-else-if="node.type === 'image'"
      :id="node.props?.id"
      :class="node.props?.class"
      :style="node.props?.style"
      :src="node.props?.src"
      :mode="node.props?.mode || 'scaleToFill'"
      :data-id="node.id"
      @tap="onTap"
    />
    
    <!-- 默认：当作 view 处理 -->
    <view 
      v-else
      :class="node.props?.class"
      :style="node.props?.style"
      :data-id="node.id"
      @tap="onTap"
    >
      <RenderNode v-for="(child, index) in node.children" :key="child.id || index" :node="child" />
    </view>
  </template>
</template>

<script lang="ts">
import { defineComponent, PropType, inject } from 'vue'
import { getPageEventHandlers } from './useVnodeTree'
import type { MPNode } from './serialize'

// 使用 defineComponent 以支持递归组件
export default defineComponent({
  name: 'RenderNode',
  props: {
    node: {
      type: Object as PropType<MPNode | null>,
      default: null
    }
  },
  setup(props) {
    // 🔑 获取当前页面 ID（由 useVnodeTree 自动 provide）
    const pageId = inject<number>('__pageId__', 0)
    console.log('[RenderNode] 当前页面ID:', pageId)

    /**
     * 统一事件处理函数
     * 从全局 Map 获取当前页面的 eventHandlers
     */
    function handleEvent(e: any, eventType: string) {
      if (!props.node?.props) return
      
      // 📖 从全局 Map 获取当前页面的 eventHandlers
      const mpInstance = getPageEventHandlers(pageId)
      
      if (!mpInstance) {
        console.warn('[RenderNode] 未找到页面的 eventHandlers, pageId:', pageId)
        return
      }
      
      // 获取事件 ID（例如：bindtap -> 'e0'）
      const bindKey = `bind${eventType}`
      const eventId = props.node.props[bindKey]
      
      console.log(`[RenderNode] ${eventType} 事件触发, eventId:`, eventId)
      
      if (!eventId) return
      
      // 🎯 关键：调用 mpInstance[eventId]
      // 真机：小程序框架调用 this[eventId](event)
      // H5：我们调用 mpInstance[eventId](event)
      if (mpInstance[eventId]) {
        console.log(`[RenderNode] 调用 mpInstance['${eventId}']`)
        
        // 创建小程序风格的事件对象
        const mpEvent = createMpEvent(e, eventType)
        
        // 调用处理器（Invoker 函数）
        const handler = mpInstance[eventId]
        if (typeof handler === 'function') {
          handler(mpEvent)
        } else if (handler && typeof handler.value === 'function') {
          // Invoker 模式：{ value: Function }
          handler.value(mpEvent)
        }
      } else {
        console.warn(`[RenderNode] 未找到事件处理器: mpInstance['${eventId}']`)
      }
    }

    /**
     * 创建小程序风格的事件对象
     */
    function createMpEvent(nativeEvent: any, eventType: string) {
      const target = nativeEvent.target || {}
      const currentTarget = nativeEvent.currentTarget || {}
      
      const mpEvent: any = {
        type: eventType,
        timeStamp: nativeEvent.timeStamp || Date.now(),
        target: {
          id: target.id || '',
          dataset: target.dataset || {},
        },
        currentTarget: {
          id: currentTarget.id || '',
          dataset: currentTarget.dataset || {},
        },
        detail: {},
      }
      
      // input 事件特殊处理
      if (eventType === 'input' && target.value !== undefined) {
        mpEvent.detail.value = target.value
      }
      
      return mpEvent
    }

    function onTap(e: any) {
      handleEvent(e, 'tap')
    }

    function onInput(e: any) {
      handleEvent(e, 'input')
    }

    return {
      onTap,
      onInput
    }
  }
})
</script>
