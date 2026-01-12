# uni-render

[![npm version](https://img.shields.io/npm/v/uni-render.svg)](https://www.npmjs.com/package/uni-render)
[![npm downloads](https://img.shields.io/npm/dm/uni-render.svg)](https://www.npmjs.com/package/uni-render)
[![license](https://img.shields.io/npm/l/uni-render.svg)](https://github.com/AlamHubb/uni-render/blob/main/LICENSE)

让 UniApp 支持 Vue 渲染函数（h 函数）开发，**兼容 H5 和微信小程序**。

## 🎯 核心特性

- ✅ **标准 Vue 语法**：使用 `h` 函数编写组件，无需学习 UniApp 模板语法
- ✅ **兼容小程序**：通过 eventId 映射，不传递函数，完全兼容微信小程序
- ✅ **响应式支持**：完整的 Vue 3 响应式系统，数据变化自动更新视图
- ✅ **纯 JSON 通信**：RenderNode 可通过 setData 传递
- ✅ **配套插件**：配合 `vite-plugin-uni-render` 零配置使用

## 📦 安装

```bash
npm install uni-render vite-plugin-uni-render
# 或
pnpm add uni-render vite-plugin-uni-render
```

## 🚀 快速开始

### 1. 配置 Vite

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'
import { uniRender } from 'vite-plugin-uni-render'

export default defineConfig({
  plugins: [
    uniRender(),
    uni()
  ]
})
```

### 2. 编写组件

**渲染函数组件（推荐方式）**：
```vue
<!-- components/Counter.vue -->
<script lang="ts">
import { ref, h, defineComponent } from 'vue'

export default defineComponent({
  setup() {
    const count = ref(0)
    
    return () => h('view', { class: 'counter' }, [
      h('text', {}, `计数: ${count.value}`),
      h('button', { onClick: () => count.value++ }, '+1')
    ])
  }
})
</script>
```

**Page 组件中使用**：
```vue
<!-- pages/index/index.vue -->
<template>
  <view>
    <Counter />
  </view>
</template>

<script setup lang="ts">
import Counter from './components/Counter.vue'
</script>
```

> **注意**：配合 `vite-plugin-uni-render` 使用时，你可以直接写 `import { ref, h } from 'vue'`，插件会自动处理导入转换。

## 🔍 工作原理

### 架构（兼容微信小程序）

```
┌──────────────────────────────────────────────────────────────┐
│  逻辑层 (JSCore)                                             │
├──────────────────────────────────────────────────────────────┤
│  1. defineRenderComponent 包装组件                           │
│  2. render() 使用 Custom Renderer 渲染                       │
│  3. VNode → RenderNode（纯 JSON，事件用 eventId 代替）       │
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
    bindtap?: string      // 事件 ID，如 '__mp_evt_1__'
    // ... 其他属性
  }
  children: RenderNode[]
  text?: string           // 文本内容
}
```

**关键**：RenderNode 是纯 JSON，没有函数，可以安全地通过 setData 传递。

## 📐 API

### defineRenderComponent(component)

将 Vue 组件包装为可在 UniApp 中使用的渲染函数组件。

```typescript
import { defineRenderComponent } from 'uni-render'

export default defineRenderComponent({
  setup() {
    const count = ref(0)
    return () => h('view', {}, `count: ${count.value}`)
  }
})
```

**返回值**：返回一个 Vue 组件，其 `setup()` 返回 `{ node }` 供模板使用。

### render(componentOrRenderFn)

底层 API，使用 Custom Renderer 渲染组件，返回响应式 RenderNode。

```typescript
import { render } from 'uni-render'

// 组件定义模式
const { node, unmount } = render(MyComponent)

// 渲染函数模式
const { node, unmount } = render(() => h('view', {}, 'Hello'))
```

### renderEvent(eventId, event)

触发渲染事件（供 RenderComponent 内部调用）。

```typescript
import { renderEvent } from 'uni-render'

function renderEvent(eventId: string, event?: any): void
```

## 🎨 支持的组件

| 类型 | 说明 |
|------|------|
| `view` | 容器（div → view） |
| `text` | 文本（span → text） |
| `button` | 按钮 |
| `input` | 输入框 |
| `image` | 图片（img → image） |
| `navigator` | 导航（a → navigator） |

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

## 🌍 平台兼容性

| 平台 | 支持 |
|------|------|
| H5 | ✅ |
| 微信小程序 | ✅ |
| 支付宝小程序 | ✅ |
| 其他小程序 | ✅ |

## ⚙️ Vue 版本要求

本库要求 **Vue 3.4.21** 版本，确保与 UniApp 的 Vue 版本兼容。

```json
{
  "peerDependencies": {
    "vue": "3.4.21",
    "@vue/runtime-core": "3.4.21",
    "@vue/runtime-dom": "3.4.21"
  }
}
```

## 📁 核心文件

| 文件 | 作用 |
|------|------|
| `renderer/customRenderer.ts` | Custom Renderer 实现 |
| `renderer/render.ts` | render() 函数 |
| `renderer/defineRenderComponent.ts` | defineRenderComponent() 高层 API |
| `renderer/event.ts` | 双 Map 事件系统（页面隔离） |
| `renderer/types.ts` | RenderNode 类型定义 |
| `components/RenderComponent.vue` | 渲染 RenderNode 的 UniApp 组件 |

## 🔗 相关链接

- [vite-plugin-uni-render](https://www.npmjs.com/package/vite-plugin-uni-render) - Vite 插件
- [create-uni-render](https://www.npmjs.com/package/create-uni-render) - 项目脚手架
- [GitHub 仓库](https://github.com/AlamHubb/uni-render)

## 📄 License

MIT
