# uniapp-vue

让 uni-app 小程序支持 Vue 3 渲染函数（h 函数）开发

## 功能

- ✅ 浏览器端：使用 Vue 标准渲染器
- ✅ 小程序端：使用自定义渲染器（customRender）
- ✅ 提供 uni-app 兼容函数

## 安装

```bash
npm install uniapp-vue
```

## 使用

### 浏览器端

直接使用 Vue 的 h 函数和 createApp：

```typescript
import { h, ref, defineComponent, createApp } from 'vue'

const App = defineComponent({
  setup() {
    const count = ref(0)
    return () => h('div', {}, count.value)
  }
})

createApp(App).mount('#app')
```

### 小程序端

使用自定义渲染器：

```typescript
import { h, ref, defineComponent } from 'vue'
import { createMpApp, createBridge, createPageHandlers } from 'uniapp-vue'

const App = defineComponent({
  setup() {
    const count = ref(0)
    return () => h('view', {}, [
      h('text', {}, `计数: ${count.value}`),
      h('button', { onClick: () => count.value++ }, '增加')
    ])
  }
})

// 页面 JS
Page({
  data: { vnodeTree: null },
  ...createPageHandlers(),
  onLoad() {
    createBridge(this)
    createMpApp(App).mount()
  }
})
```

### 页面 WXML

```xml
<import src="/templates/render.wxml"/>
<template is="node" data="{{node: vnodeTree}}"/>
```

## API

### 从 Vue 导出

- `h` - 创建虚拟节点
- `ref`, `reactive`, `computed` - 响应式
- `defineComponent` - 定义组件
- `createApp` - 创建应用（浏览器端）

### 小程序专用

- `createMpApp` - 创建应用（小程序端，使用自定义渲染器）
- `createBridge` - 连接渲染器和页面实例
- `createPageHandlers` - 创建事件处理器

### uni-app 兼容

- `t()` - 文本处理
- `o()` - 事件处理
- `onLaunch`, `onShow`, `onHide` - 生命周期

## 架构

```
用户代码: import { h } from 'vue'
              ↓
浏览器端: Vue 标准渲染器 → DOM
小程序端: 自定义渲染器 → 虚拟节点 → setData → WXML
```

## 目录结构

```
uniapp-vue/
├── index.ts           # 入口
├── src/
│   ├── renderer/      # 自定义渲染器
│   │   ├── renderer.ts
│   │   ├── nodeOps.ts
│   │   ├── patchProp.ts
│   │   └── serialize.ts
│   ├── events.ts      # 事件系统
│   └── bridge.ts      # 桥接层
└── templates/
    └── render.wxml    # 小程序递归模板
```

## License

MIT
