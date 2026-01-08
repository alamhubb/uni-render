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
  <render-node :node="mpNode" />
</template>

<script setup>
import { defineComponent, ref as vueRef } from 'vue'
import { ref, h, useMPNodeRenderer, watch } from 'uniapp-render'

// 定义内部组件
const InnerComponent = {
  setup() {
    const count = ref(0)
    
    return () => h('view', { class: 'counter' }, [
      h('text', {}, `计数: ${count.value}`),
      h('button', { onClick: () => count.value++ }, '+1')
    ])
  }
}

// 使用 Custom Renderer
const mpNodeInternal = useMPNodeRenderer(InnerComponent)

// 桥接到 mp-vue
const mpNode = vueRef(mpNodeInternal.value)
watch(() => mpNodeInternal.value, (newVal) => {
  mpNode.value = newVal
}, { deep: true })
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

### useMPNodeRenderer(componentOrRenderFn)

使用 Custom Renderer 渲染组件，返回响应式 MPNode。

```typescript
// 组件定义模式
function useMPNodeRenderer(component: Component): ComputedRef<MPNode>

// 渲染函数模式
function useMPNodeRenderer(renderFn: () => VNode): ComputedRef<MPNode>
```

**特性**：
- 自动在组件卸载时清理事件
- 支持组件定义和渲染函数两种模式

### RenderNode

渲染 MPNode 数据的组件。

```vue
<render-node :node="mpNode" />
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
    <render-node :node="mpNode" />
  </view>
</template>

<script setup>
import { ref as vueRef } from 'vue'
import { ref, h, useMPNodeRenderer, watch, computed } from 'uniapp-render'

// 定义内部组件
const CounterComponent = {
  setup() {
    const count = ref(0)
    const double = computed(() => count.value * 2)
    
    return () => h('view', { class: 'counter' }, [
      h('text', { class: 'count' }, `计数: ${count.value}`),
      h('text', { class: 'double' }, `双倍: ${double.value}`),
      h('view', { class: 'buttons' }, [
        h('button', { onClick: () => count.value-- }, '-1'),
        h('button', { onClick: () => count.value++ }, '+1')
      ])
    ])
  }
}

// 使用 Custom Renderer
const mpNodeInternal = useMPNodeRenderer(CounterComponent)

// 桥接到 mp-vue
const mpNode = vueRef(mpNodeInternal.value)
watch(() => mpNodeInternal.value, (v) => mpNode.value = v, { deep: true })
</script>
```

## 🌍 平台兼容性

| 平台 | 支持 |
|------|------|
| H5 | ✅ |
| 微信小程序 | ✅ |
| 支付宝小程序 | ✅ |
| 其他小程序 | ✅ |

## 🔬 核心技术实现

### Custom Renderer 架构

基于 Vue `createRenderer` 实现独立的渲染器，将 Vue 组件渲染为纯 JSON（MPNode）。

```
Vue 组件 (runtime-core)
       ↓ createRenderer
InternalNode（内部节点树）
       ↓ toMPNode
MPNode（纯 JSON）
       ↓ RenderNode
真实 UI
```

### 响应式桥接

**问题**：运行在 `@vue/runtime-core` 中，需要与 `mp-vue` 的模板系统通信。

**方案**：两套响应式系统 + watch 手动同步

```typescript
// 内部系统（@vue/runtime-core）
const mpNodeInternal = useMPNodeRenderer(InnerComponent)

// 外部系统（mp-vue）
const mpNode = vueRef(mpNodeInternal.value)

// 桥接：监听内部变化 → 同步到外部
watch(() => mpNodeInternal.value, (newVal) => {
  mpNode.value = newVal  // 触发 mp-vue 模板更新
}, { deep: true })
```

### 事件系统

**问题**：`vOn` 需要在 mp-vue 组件上下文中调用，但 Custom Renderer 运行在独立的上下文。

**方案**：两套事件系统

```typescript
// 1. 内部：全局事件注册表
const eventRegistry = new Map<string, Function>()

export function registerEvent(handler: Function): string {
  const eventId = `__mp_evt_${++counter}__`
  eventRegistry.set(eventId, handler)
  return eventId
}

// 2. 外部：RenderNode 触发事件
export function triggerEvent(eventId: string, event?: any): void {
  eventRegistry.get(eventId)?.(event)
}
```

**事件流程**：
```
h('view', { onClick: handler })
  ↓ patchProp
registerEvent(handler) → eventId
  ↓
MPNode: { props: { bindtap: eventId, 'data-eid': eventId }}
  ↓
RenderNode 渲染 → 用户点击
  ↓
onTap → triggerEvent(eventId) → handler()
```

### 核心文件

| 文件 | 作用 |
|------|------|
| `mpRenderer.ts` | Custom Renderer 实现，nodeOps + patchProp |
| `eventRegistry.ts` | 全局事件注册表 |
| `serialize.ts` | InternalNode → MPNode 转换 |

## 📄 License

MIT

