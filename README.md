# uniapp-vue

> 让 UniApp 支持 Vue 渲染函数（h 函数）开发，实现**动态结构 + 动态数据**的小程序渲染方案

## 🎯 核心定位

**解决的问题**：UniApp 原生只支持 template 模板，无法使用 h() 渲染函数动态创建视图结构。

**我们的方案**：通过 `useVnodeTree` + `RenderNode` 组件，将 h() 渲染函数的输出转换为可被 UniApp 渲染的数据结构。

## 📐 架构原理

### UniApp 原生方案 vs 我们的方案

| | UniApp 原生 | uniapp-vue |
|---|------------|------------|
| **模板** | 每页一个静态 WXML | 通用 RenderNode 递归渲染 |
| **setData 内容** | 只有数据 | 结构 + 数据 |
| **编译时确定** | DOM 结构 | 无 |
| **运行时确定** | 数据值 | 结构 + 数据 |

### 工作流程

```
h('view', { class: 'box' }, 'Hello')
    ↓
useVnodeTree() 转换为 MPNode
    ↓
{ type: 'view', props: { class: 'box' }, text: 'Hello', children: [] }
    ↓
RenderNode 组件递归渲染
    ↓
UniApp 正常编译为 WXML
    ↓
小程序渲染
```

### 核心组件

| 组件 | 作用 |
|------|------|
| **useVnodeTree** | 将 h() 渲染函数转换为响应式的 MPNode 数据结构 |
| **RenderNode.vue** | 通用递归渲染组件，根据 node.type 渲染不同元素 |
| **MPNode** | 小程序节点数据结构 `{ id, type, props, text, children }` |

## 🚀 使用方式

### 1. 安装依赖

```bash
npm install uniapp-vue
```

### 2. 在 UniApp 项目中使用

```vue
<template>
  <view class="container">
    <text class="title">h() 函数测试</text>
    
    <!-- 使用 RenderNode 渲染动态内容 -->
    <RenderNode :node="vnodeTree" />
  </view>
</template>

<script setup lang="ts">
import { h, ref, computed } from 'vue'
import { useVnodeTree, RenderNode } from 'uniapp-vue'

// 响应式数据
const count = ref(0)

// 定义渲染函数
const renderFn = () => h('view', { class: 'counter' }, [
  h('text', {}, `计数: ${count.value}`),
  h('button', { onClick: () => count.value++ }, '+1')
])

// 转换为响应式 MPNode 数据
const vnodeTree = useVnodeTree(renderFn)
</script>
```

### 3. 支持的元素类型

RenderNode 目前支持以下元素：
- `view` - 容器
- `text` - 文本
- `button` - 按钮
- `input` - 输入框
- `image` - 图片

## 📦 项目结构

```
uniapp-vue/
├── uniapp-vue/                      # 核心运行时包
│   ├── src/
│   │   ├── renderer/                # 渲染器实现
│   │   │   ├── useVnodeTree.ts      # VNode → MPNode 转换
│   │   │   ├── RenderNode.vue       # 通用递归渲染组件
│   │   │   ├── serialize.ts         # MPNode 类型定义
│   │   │   ├── nodeOps.ts           # Custom Renderer 节点操作
│   │   │   └── renderer.ts          # Custom Renderer 实现
│   │   └── events.ts                # 事件系统
│   └── index.ts                     # 导出 API
└── vite-plugin-uniappvue/           # Vite 插件
```

## 🎨 导出的 API

### 动态渲染 API（核心功能）

```typescript
import {
  // 核心
  useVnodeTree,         // 将渲染函数转换为响应式 MPNode
  RenderNode,           // 递归渲染组件
  
  // 事件
  triggerEvent,         // 触发节点事件
  bindEvent,            // 绑定节点事件
  
  // 类型
  MPNode,               // 节点数据结构
} from 'uniapp-vue'
```

### Vue 3 API（完整支持）

```typescript
import {
  // 响应式
  ref, reactive, computed, watch,
  // 组件
  defineComponent, h,
  // 生命周期
  onMounted, onUnmounted,
  // ...所有 Vue 3 API
} from 'uniapp-vue'
```

### 事件系统

```typescript
import { eventBus, bindNodeEvent, triggerNodeEvent } from 'uniapp-vue'
```

### UniApp 兼容函数

```typescript
import { t, o, injectHook, onLaunch, onShow, onHide } from 'uniapp-vue'
```

## 🔗 与 UniApp 的关系

**uniapp-vue 与 UniApp 可以混合使用**：

- 同一项目中，部分页面使用普通 template，部分页面使用 h() 函数
- 同一页面中，部分内容使用 template，部分内容使用 RenderNode 动态渲染

```vue
<template>
  <view>
    <!-- UniApp 正常 template 内容 -->
    <text>普通内容</text>
    
    <!-- h() 函数动态渲染区域 -->
    <RenderNode :node="dynamicContent" />
  </view>
</template>
```

## 📄 License

MIT
