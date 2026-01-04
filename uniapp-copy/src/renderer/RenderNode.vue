<template>
  <!-- 递归渲染 vnodeTree -->
  <block v-if="node">
    <!-- view 容器 -->
    <view 
      v-if="node.type === 'view'"
      :id="node.props?.id"
      :class="node.props?.class"
      :style="node.props?.style"
      :data-id="node.id"
      @tap="onTap"
    >
      <RenderNode v-for="child in node.children" :key="child.id" :node="child" />
    </view>
    
    <!-- text 文本 -->
    <text 
      v-else-if="node.type === 'text'"
      :id="node.props?.id"
      :class="node.props?.class"
      :style="node.props?.style"
    >{{ node.text || '' }}<template v-for="child in node.children" :key="child.id"><RenderNode :node="child" /></template></text>
    
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
    >
      <RenderNode v-for="child in node.children" :key="child.id" :node="child" />
    </button>
    
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
      <RenderNode v-for="child in node.children" :key="child.id" :node="child" />
    </view>
  </block>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue'
import { triggerEvent } from './useVnodeTree'
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
    function onTap(e: any) {
      const nodeId = e.currentTarget?.dataset?.id
      if (nodeId) {
        triggerEvent(Number(nodeId), 'tap', e)
      }
    }

    function onInput(e: any) {
      const nodeId = e.currentTarget?.dataset?.id
      if (nodeId) {
        triggerEvent(Number(nodeId), 'input', e)
      }
    }

    return {
      onTap,
      onInput
    }
  }
})
</script>
