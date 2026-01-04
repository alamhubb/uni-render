# uniapp-vue

为 UniApp 小程序提供 Vue 3 渲染函数（h 函数）支持，采用全局 Map + Invoker 模式实现跨平台事件分发。

## 📦 版本信息

- **版本**: 4.0.0
- **更新时间**: 2026-01-04
- **核心特性**: 全局 Map + Invoker 模式

---

## 🎯 核心架构

### 双线程架构

```
┌──────────────────────────────────────────────────────────────────────┐
│                       逻辑层 (JSCore)                                 │
├──────────────────────────────────────────────────────────────────────┤
│  用户代码                                                             │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ const { vnodeTree } = useVnodeTree(() =>                        │ │
│  │   h('button', { onClick: increment }, '点击')                   │ │
│  │ )                                                                │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                │                                      │
│                                ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ useVnodeTree 内部处理:                                          │ │
│  │ 1. 生成事件 ID: 'e0'                                            │ │
│  │ 2. 创建 Invoker: eventHandlers['e0'] = invoker                  │ │
│  │ 3. 存储到全局 Map: pageEventHandlers.set(pageId, eventHandlers) │ │
│  │ 4. vnodeTree.props = { bindtap: 'e0' }  (可序列化)              │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                │                                      │
│                                ▼ setData({ vnodeTree })               │
└──────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│                       渲染层 (WebView)                                │
├──────────────────────────────────────────────────────────────────────┤
│  RenderNode.vue                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ <button @tap="onTap">{{ node.text }}</button>                   │ │
│  │                                                                  │ │
│  │ 用户点击 → onTap(e)                                             │ │
│  │   ↓                                                              │ │
│  │ eventId = node.props.bindtap  // 'e0'                           │ │
│  │   ↓                                                              │ │
│  │ mpInstance = getPageEventHandlers(pageId)                       │ │
│  │   ↓                                                              │ │
│  │ mpInstance['e0'](event)  // 调用 Invoker                        │ │
│  │   ↓                                                              │ │
│  │ increment()  // 执行真实的事件处理函数                           │ │
│  └─────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 🔧 事件系统设计

### Invoker 模式

Invoker 是一个包装函数，模仿 UniApp 的事件处理机制：

```typescript
interface Invoker {
    (e: any): void        // Invoker 本身是函数
    value: Function       // 真正的事件处理函数存在 value 属性
}
```

**优点**：
- 更新事件时只需更新 `invoker.value`，invoker 本身引用不变
- 避免频繁创建/销毁函数对象
- 与 UniApp 原生机制一致

### 全局 Map 存储

```typescript
// 全局 Map：页面ID -> eventHandlers
const pageEventHandlers = new Map<number, Record<string, Invoker>>()
```

- **Key**: Vue 组件实例的 `uid`（唯一标识）
- **Value**: 该页面/组件的所有事件处理器

### 事件分发流程

```
用户点击按钮
    ↓
RenderNode 的 @tap 触发
    ↓
获取 eventId = node.props.bindtap  // 'e0'
    ↓
如果 eventId 为空，直接返回（避免冒泡误触发）
    ↓
从全局 Map 获取: mpInstance = getPageEventHandlers(pageId)
    ↓
调用 Invoker: mpInstance['e0'](event)
    ↓
Invoker 内部: invoker.value(event)
    ↓
执行真实处理函数: increment()
    ↓
响应式数据更新: count.value++
    ↓
watchEffect 触发
    ↓
重新生成 vnodeTree
    ↓
UI 自动更新
```

---

## 📝 使用方式

### 基础用法

```vue
<template>
  <view class="container">
    <text class="title">计数器</text>
    <RenderNode v-if="vnodeTree" :node="vnodeTree" />
  </view>
</template>

<script setup lang="ts">
import { ref, h } from 'vue'
import { useVnodeTree, RenderNode } from 'uniapp-vue'

const count = ref(0)

const increment = () => {
  count.value++
}

// ✨ 只需这一行！自动处理事件绑定和全局 Map 存储
const { vnodeTree } = useVnodeTree(() =>
  h('view', { class: 'counter' }, [
    h('text', {}, `计数: ${count.value}`),
    h('button', { onClick: increment }, '+1')
  ])
)
</script>
```

### API 说明

#### `useVnodeTree(renderFn)`

将 Vue 渲染函数转换为响应式的 vnodeTree。

**参数**：
- `renderFn: () => VNode` - 返回 VNode 的渲染函数

**返回值**：
```typescript
{
  vnodeTree: Ref<MPNode | null>,  // 响应式的虚拟节点树
  eventHandlers: Record<string, Invoker>  // 事件处理器映射
}
```

**自动行为**：
- 自动获取组件 uid 作为 pageId
- 自动存储 eventHandlers 到全局 Map
- 自动 provide `__pageId__` 给子组件
- 自动在 `onUnmounted` 时清理全局 Map

#### `RenderNode`

递归渲染 vnodeTree 的 Vue 组件。

**Props**：
- `node: MPNode | null` - 要渲染的虚拟节点

**支持的元素**：
- `view` - 容器
- `text` - 文本
- `button` - 按钮
- `input` - 输入框
- `image` - 图片

#### `getPageEventHandlers(pageId)`

获取指定页面的事件处理器。

**参数**：
- `pageId: number` - Vue 组件实例的 uid

**返回值**：
- `Record<string, Invoker> | null`

#### `setupPageEventProxy(pageInstance, eventHandlers, maxEvents?)`

在小程序页面实例上设置事件代理（真机小程序专用）。

**参数**：
- `pageInstance: any` - 小程序页面或组件实例（this）
- `eventHandlers: Record<string, any>` - useVnodeTree 返回的 eventHandlers
- `maxEvents?: number` - 最大事件数量，默认 100

---

## 🗂️ 目录结构

```
uniapp-vue/
├── index.ts                    # 入口，导出所有 API
├── src/
│   ├── events.ts               # mitt 事件总线（备用）
│   ├── renderer/
│   │   ├── renderer.ts         # Custom Renderer 实现
│   │   ├── nodeOps.ts          # 节点操作（createElement, insert 等）
│   │   ├── patchProp.ts        # 属性更新
│   │   ├── serialize.ts        # MPNode 序列化
│   │   ├── useVnodeTree.ts     # 🔑 核心：渲染函数转 vnodeTree + 事件管理
│   │   └── RenderNode.vue      # 🔑 核心：递归渲染组件
│   └── compat.ts               # Vue 兼容层
```

---

## 🔄 MPNode 数据结构

```typescript
interface MPNode {
  id: number                      // 唯一节点 ID
  type: string                    // 节点类型: 'view', 'text', 'button', ...
  props: Record<string, any>      // 属性（事件只存 ID，如 { bindtap: 'e0' }）
  text?: string                   // 文本内容
  children: MPNode[]              // 子节点
}
```

**关键点**：`props` 中的事件只存储 ID 字符串（如 `'e0'`），不存储函数引用，确保可序列化。

---

## 🆚 与旧版本对比

| 特性 | v2.0 (旧) | v4.0 (新) |
|------|-----------|-----------|
| 事件存储 | `Map<nodeId, Map<eventName, Function>>` | `Map<pageId, Record<eventId, Invoker>>` |
| 事件查找 | 通过 nodeId + eventName | 通过 pageId + eventId |
| Invoker 模式 | ❌ | ✅ |
| 全局 Map | ❌ 模块级别 | ✅ |
| 自动 provide | ❌ | ✅ |
| 自动清理 | ❌ | ✅ |
| 多页面支持 | ⚠️ 有问题 | ✅ |

---

## 🐛 已知问题

### 事件冒泡

由于 `RenderNode.vue` 给所有元素都绑定了 `@tap`，点击子元素时事件会冒泡到父元素。已通过提前检查 eventId 解决：

```typescript
if (!eventId) {
  return  // 没有 eventId 说明当前节点没有绑定事件，直接返回
}
```

---

## 📜 License

MIT
