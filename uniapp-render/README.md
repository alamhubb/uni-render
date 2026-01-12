# uni-render

让 UniApp 支持 Vue 渲染函数（h 函数）开发，**兼容微信小程序**。

## 🎯 核心特性

- ✅ **兼容微信小程序**：通过 eventId 映射，不传递函数
- ✅ **响应式支持**：数据变化自动更新视图
- ✅ **简单 API**：只需 `useRender` + 响应式桥接
- ✅ **纯 JSON 通信**：RenderNode 可通过 setData 传递

## 📦 安装

```bash
npm install uni-render
# 或
pnpm add uni-render
```

## 🚀 快速开始

```vue
<template>
  <render-component :node="node" />
</template>

<script setup>
import { ref as vueRef } from 'vue'
import { ref, h, useRender, watch } from 'uni-render'

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
const nodeInternal = useRender(InnerComponent)

// 桥接到 mp-vue
const node = vueRef(nodeInternal.value)
watch(() => nodeInternal.value, (newVal) => {
  node.value = newVal
}, { deep: true })
</script>
```

## 🔍 工作原理

### 架构（兼容微信小程序）

```
┌──────────────────────────────────────────────────────────────┐
│  逻辑层 (JSCore)                                             │
├──────────────────────────────────────────────────────────────┤
│  1. useRender 执行 render 函数                               │
│  2. VNode → RenderNode（纯 JSON，事件用 eventId 代替）       │
│  3. 事件处理器存入 Map                                        │
│  4. 响应式变化 → 自动重新生成 RenderNode                      │
└────────────────────────┬─────────────────────────────────────┘
                         │ setData({ node: RenderNode })
                         │ ← 纯 JSON，可以传递
                         ▼
┌──────────────────────────────────────────────────────────────┐
│  渲染层 (WebView)                                            │
├──────────────────────────────────────────────────────────────┤
│  1. RenderComponent 接收 RenderNode                          │
│  2. 递归渲染为原生组件                                        │
│  3. 事件触发 → renderEvent(eventId)                          │
└──────────────────────────────────────────────────────────────┘
```

### RenderNode 数据结构

```typescript
interface RenderNode {
  id: number              // 节点 ID
  type: string            // 'view' | 'text' | 'button' | ...
  props: {
    class?: string
    style?: string
    bindtap?: string      // 事件 ID，如 'e0'
    // ... 其他属性
  }
  children: RenderNode[]
  text?: string           // 文本内容
}
```

**关键**：RenderNode 是纯 JSON，没有函数，可以安全地通过 setData 传递。

## 📐 API

### useRender(componentOrRenderFn)

使用 Custom Renderer 渲染组件，返回响应式 RenderNode。

```typescript
// 组件定义模式
function useRender(component: Component): ComputedRef<RenderNode>

// 渲染函数模式
function useRender(renderFn: () => VNode): ComputedRef<RenderNode>
```

**特性**：
- 自动在组件卸载时清理事件
- 支持组件定义和渲染函数两种模式

### renderEvent(eventId, event)

触发渲染事件（供 RenderComponent 调用）。

```typescript
function renderEvent(eventId: string, event?: any): void
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
| `onLongPress` | `bindlongpress` |
| `onInput` | `bindinput` |
| `onChange` | `bindchange` |
| `onFocus` | `bindfocus` |
| `onBlur` | `bindblur` |

## 📝 完整示例

```vue
<template>
  <view class="container">
    <text class="title">计数器</text>
    <render-component :node="node" />
  </view>
</template>

<script setup>
import { ref as vueRef } from 'vue'
import { ref, h, useRender, watch, computed } from 'uni-render'

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
const nodeInternal = useRender(CounterComponent)

// 桥接到 mp-vue
const node = vueRef(nodeInternal.value)
watch(() => nodeInternal.value, (v) => node.value = v, { deep: true })
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

基于 Vue `createRenderer` 实现独立的渲染器，将 Vue 组件渲染为纯 JSON（RenderNode）。

```
Vue 组件 (runtime-core)
       ↓ createRenderer
InternalNode（内部节点树）
       ↓ toRenderNode
RenderNode（纯 JSON）
       ↓ RenderComponent
真实 UI
```

### 响应式桥接

**问题**：运行在 `@vue/runtime-core` 中，需要与 `mp-vue` 的模板系统通信。

**方案**：两套响应式系统 + watch 手动同步

```typescript
// 内部系统（@vue/runtime-core）
const nodeInternal = useRender(InnerComponent)

// 外部系统（mp-vue）
const node = vueRef(nodeInternal.value)

// 桥接：监听内部变化 → 同步到外部
watch(() => nodeInternal.value, (newVal) => {
  node.value = newVal  // 触发 mp-vue 模板更新
}, { deep: true })
```

### 事件系统（双 Map 架构）

**问题**：`vOn` 需要在 mp-vue 组件上下文中调用，但 Custom Renderer 运行在独立的上下文。

**方案**：双 Map 事件系统

```typescript
// 1. 全局事件表：eventId → handler
const eventRegistry = new Map<string, Function>()

// 2. 组件事件表：scopeId → Set<eventId>
const scopeRegistry = new Map<string, Set<string>>()

// 注册事件（带作用域）
export function registerEvent(handler: Function, scopeId?: string): string {
  const eventId = `__mp_evt_${++counter}__`
  eventRegistry.set(eventId, handler)
  if (scopeId) {
    scopeRegistry.get(scopeId)!.add(eventId)
  }
  return eventId
}

// 触发事件
export function renderEvent(eventId: string, event?: any): void {
  eventRegistry.get(eventId)?.(event)
}

// 清理作用域事件
export function clearEventScope(scopeId: string): void {
  const eventIds = scopeRegistry.get(scopeId)
  eventIds?.forEach(id => eventRegistry.delete(id))
  scopeRegistry.delete(scopeId)
}
```

**事件流程**：
```
h('view', { onClick: handler })
  ↓ patchProp
registerEvent(handler, scopeId) → eventId
  ↓
RenderNode: { props: { bindtap: eventId, 'data-eid-tap': eventId }}
  ↓
RenderComponent 渲染 → 用户点击
  ↓
onTap → renderEvent(eventId) → handler()
```

### 核心文件

| 文件 | 作用 |
|------|------|
| `mpRenderer.ts` | Custom Renderer 实现（useRender, toRenderNode） |
| `eventRegistry.ts` | 双 Map 事件系统（页面隔离） |
| `types.ts` | RenderNode 类型定义 |

## 📄 License

MIT
