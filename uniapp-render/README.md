# uniapp-render

让 UniApp 支持 Vue 渲染函数（h 函数）开发，**兼容微信小程序**。

## 🎯 核心特性

- ✅ **兼容微信小程序**：通过 eventId 映射，不传递函数
- ✅ **响应式支持**：数据变化自动更新视图
- ✅ **简单 API**：只需 `useRenderNode` + `RenderNode`
- ✅ **纯 JSON 通信**：MPNode 可通过 setData 传递

## 📦 安装

```bash
npm install uniapp-render
# 或
pnpm add uniapp-render
```

## 🚀 快速开始

```vue
<template>
  <RenderNode :node="node" :eventHandler="handleEvent" />
</template>

<script setup>
import { h, ref } from 'vue'
import { useRenderNode, RenderNode } from 'uniapp-render'

const count = ref(0)

// useRenderNode 返回：
// - node: 响应式的 MPNode（纯 JSON，可通过 setData 传递）
// - handleEvent: 事件处理函数（通过 eventId 找到对应处理器）
const { node, handleEvent } = useRenderNode(() =>
  h('view', { class: 'counter' }, [
    h('text', {}, `计数: ${count.value}`),
    h('button', { onClick: () => count.value++ }, '+1')
  ])
)
</script>
```

## 🔍 工作原理

### 架构（兼容微信小程序）

```
┌──────────────────────────────────────────────────────────────┐
│  逻辑层 (JSCore)                                             │
├──────────────────────────────────────────────────────────────┤
│  1. useRenderNode 执行 render 函数                           │
│  2. VNode → MPNode（纯 JSON，事件用 eventId 代替）            │
│  3. 事件处理器存入 Map                                        │
│  4. 响应式变化 → 自动重新生成 MPNode                          │
└────────────────────────┬─────────────────────────────────────┘
                         │ setData({ node: MPNode })
                         │ ← 纯 JSON，可以传递
                         ▼
┌──────────────────────────────────────────────────────────────┐
│  渲染层 (WebView)                                            │
├──────────────────────────────────────────────────────────────┤
│  1. RenderNode 接收 MPNode                                   │
│  2. 递归渲染为原生组件                                        │
│  3. 事件触发 → handleEvent(eventId)                          │
└──────────────────────────────────────────────────────────────┘
```

### MPNode 数据结构

```typescript
interface MPNode {
  id: number              // 节点 ID
  type: string            // 'view' | 'text' | 'button' | ...
  props: {
    class?: string
    style?: string
    bindtap?: string      // 事件 ID，如 'e0'
    // ... 其他属性
  }
  children: MPNode[]
  text?: string           // 文本内容
}
```

**关键**：MPNode 是纯 JSON，没有函数，可以安全地通过 setData 传递。

## 📐 API

### useRenderNode(renderFn)

在逻辑层执行 render 函数，返回可序列化的 MPNode。

```typescript
function useRenderNode(renderFn: () => VNode): {
  node: Ref<MPNode | null>        // 响应式 MPNode
  handleEvent: (eventId: string, event?: any) => void  // 事件回调
  eventHandlers: Map<string, Function>  // 事件处理器 Map（调试用）
}
```

### RenderNode

渲染 MPNode 数据的组件。

```vue
<RenderNode 
  :node="node"              <!-- MPNode 数据 -->
  :eventHandler="handleEvent"  <!-- 事件回调函数 -->
/>
```

## 🎨 支持的组件

| 类型 | 说明 |
|------|------|
| `view` | 容器 |
| `text` | 文本 |
| `button` | 按钮 |
| `input` | 输入框 |
| `image` | 图片 |

## 🔧 事件支持

| Vue 事件 | 小程序事件 |
|----------|-----------|
| `onClick` | `bindtap` |
| `onTap` | `bindtap` |
| `onInput` | `bindinput` |
| `onChange` | `bindchange` |
| `onFocus` | `bindfocus` |
| `onBlur` | `bindblur` |

## 📝 完整示例

```vue
<template>
  <view class="container">
    <text class="title">计数器</text>
    <RenderNode :node="node" :eventHandler="handleEvent" />
  </view>
</template>

<script setup>
import { h, ref, computed } from 'vue'
import { useRenderNode, RenderNode } from 'uniapp-render'

const count = ref(0)
const double = computed(() => count.value * 2)

const increment = () => count.value++
const decrement = () => count.value--

const { node, handleEvent } = useRenderNode(() =>
  h('view', { class: 'counter' }, [
    h('text', { class: 'count' }, `计数: ${count.value}`),
    h('text', { class: 'double' }, `双倍: ${double.value}`),
    h('view', { class: 'buttons' }, [
      h('button', { onClick: decrement }, '-1'),
      h('button', { onClick: increment }, '+1')
    ])
  ])
)
</script>
```

## 🌍 平台兼容性

| 平台 | 支持 |
|------|------|
| H5 | ✅ |
| 微信小程序 | ✅ |
| 支付宝小程序 | ✅ |
| 其他小程序 | ✅ |

## 📄 License

MIT
