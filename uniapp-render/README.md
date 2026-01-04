# uniapp-render

核心运行时包，提供 `useVnodeTree` 和 `RenderNode` 功能。

## 安装

```bash
npm install uniapp-render
```

## 核心 API

### `useVnodeTree(renderFn)`

将 h() 渲染函数转换为响应式的 MPNode 数据。

```typescript
import { h } from 'vue'
import { useVnodeTree } from 'uniapp-render'

const { vnodeTree } = useVnodeTree(() => h('view', {}, 'Hello'))
```

**工作原理**：

1. 接收一个返回 VNode 的渲染函数
2. 使用 `watchEffect` 追踪响应式依赖
3. 将 VNode 树转换为可序列化的 MPNode 数据
4. 自动处理事件：`onClick` → `bindtap: 'e0'`
5. 事件处理器存储在 `getApp().globalData.__eventHandlers__`

### `RenderNode`

递归渲染组件，将 MPNode 数据渲染为 UniApp 组件。

```vue
<template>
  <RenderNode :node="vnodeTree" />
</template>

<script setup>
import { RenderNode } from 'uniapp-render'
</script>
```

### 类型定义

```typescript
// MPNode - 小程序节点数据结构
interface MPNode {
  id: number           // 节点 ID
  type: string         // 节点类型
  props: Record<string, any>  // 属性
  text?: string        // 文本内容
  children: MPNode[]   // 子节点
}
```

## 事件处理

### 事件转换规则

| Vue 事件 | 小程序事件 |
|---------|-----------|
| `onClick` | `bindtap` |
| `onTap` | `bindtap` |
| `onInput` | `bindinput` |
| `onChange` | `bindchange` |
| `onFocus` | `bindfocus` |
| `onBlur` | `bindblur` |

### 事件存储

事件处理器存储在全局 `getApp().globalData.__eventHandlers__`：

```
Map<pageId, Record<eventId, Invoker>>
```

- `pageId`: Vue 组件实例的 `uid`
- `eventId`: 递增的事件 ID（`e0`, `e1`, ...）
- `Invoker`: 事件处理器包装对象，支持热更新

## 目录结构

```
src/
├── index.ts           # 入口文件
└── renderer/
    ├── index.ts       # renderer 模块入口
    ├── useVnodeTree.ts    # 核心：VNode → MPNode 转换
    ├── RenderNode.vue     # 递归渲染组件
    ├── triggerEvent.ts    # 事件触发函数
    └── serialize.ts       # MPNode 类型定义
```
