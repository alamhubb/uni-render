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
        nodeToRender.text
      }}
      <render-component v-for="(child, index) in nodeToRender.children" :key="child.id || index" :node="child" />
    </text>

    <!-- 纯文本节点 -->
    <text v-else-if="nodeToRender.type === '#text'" :class="attrs.class">{{ nodeToRender.text }}</text>

    <!-- button 按钮 -->
    <button v-else-if="nodeToRender.type === 'button'" :id="nodeToRender.props?.id"
      :class="[attrs.class, nodeToRender.props?.class]" :style="nodeToRender.props?.style"
      :type="nodeToRender.props?.type || 'default'" :data-id="nodeToRender.id" @tap="onTap">
      <text v-if="nodeToRender.text">{{ nodeToRender.text }}</text>
      <render-component v-for="(child, index) in nodeToRender.children" :key="child.id || index" :node="child" />
    </button>

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

    <!-- navigator 导航/链接 -->
    <navigator v-else-if="nodeToRender.type === 'navigator'" :id="nodeToRender.props?.id"
      :class="[attrs.class, nodeToRender.props?.class]" :style="nodeToRender.props?.style"
      :url="nodeToRender.props?.href || nodeToRender.props?.url"
      :target="nodeToRender.props?.target === '_blank' ? 'miniProgram' : 'self'" :data-id="nodeToRender.id">
      <text v-if="nodeToRender.text">{{ nodeToRender.text }}</text>
      <render-component v-for="(child, index) in nodeToRender.children" :key="child.id || index" :node="child" />
    </navigator>

    <!-- 默认：当作 view 处理 -->
    <view v-else :class="[attrs.class, nodeToRender.props?.class]" :style="nodeToRender.props?.style"
      :data-id="nodeToRender.id" @tap="onTap">
      <render-component v-for="(child, index) in nodeToRender.children" :key="child.id || index" :node="child" />
    </view>
  </template>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue'
import type { PropType } from 'vue'
import { renderEvent } from 'uni-render'
import type { RenderNode } from 'uni-render'

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
      if (!nodeToRender.value?.props) return

      const eventId = nodeToRender.value.props[`data-eid-${eventType}`]
      if (!eventId || typeof eventId !== 'string') return

      renderEvent(eventId, e)
    }

    function onTap(e: any) {
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
