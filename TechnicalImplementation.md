# uni-render 技术实现原理

[![npm version](https://img.shields.io/npm/v/uni-render.svg)](https://www.npmjs.com/package/uni-render)
[![GitHub](https://img.shields.io/badge/GitHub-uni--render-blue)](https://github.com/alamhubb/uni-render)

## 📦 项目链接

- **GitHub 仓库**: https://github.com/alamhubb/uni-render
- **模板项目**: https://github.com/alamhubb/uni-render-template
- **快速体验**: `npx create-uni-render my-app`

---

## 🎯 为什么做这件事？

UniApp 官方明确表示**不支持**在小程序端使用 Vue 的 `h` 函数（渲染函数）：

> "小程序端是模板静态编译，动态会损失性能" — [UniApp Issue #4683](https://github.com/dcloudio/uni-app/issues/4683#issuecomment-1888656524)

但我需要在 UniApp 中使用渲染函数，因为：

1. **更高的灵活性**：渲染函数可以实现模板无法表达的复杂逻辑
2. **更好的 TypeScript 支持**：渲染函数天然支持完整的类型推导
3. **支持 DSL 扩展**：可以基于 `h` 函数构建自定义 DSL（如 ovsjs 语法）

既然官方不支持，那我们就**自己动手解决**！

---

## 🏗️ 整体架构

本项目采用**运行时 + 编译时**双层架构：

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              编译时 (Vite Plugin)                            │
├─────────────────────────────────────────────────────────────────────────────┤
│  vite-plugin-uni-render                                                     │
│  ├── 拦截 .vue 文件导入                                                      │
│  ├── 将 import 'vue' → import 'uni-render'                                  │
│  ├── Page 组件: 保持 .vue 格式 + defineRenderComponent 包装                  │
│  └── 非 Page 组件: 转为虚拟 .ts 模块，绕过 UniApp 编译                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              运行时 (uni-render)                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  1. Custom Renderer: 将 h() 渲染为 VNode → RenderNode (纯 JSON)              │
│  2. Event System: 双 Map 事件注册，用 eventId 替代函数引用                    │
│  3. RenderComponent: 接收 RenderNode，递归渲染为 UniApp 原生组件              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 📁 项目结构

整个项目非常精简，核心代码不超过 **1000 行**：

```
uni-render/
├── uni-render/                    # 运行时核心库
│   └── src/
│       ├── index.ts               # 入口文件
│       ├── renderer/
│       │   ├── customRenderer.ts  # Vue Custom Renderer (~270 行)
│       │   ├── render.ts          # render() API (~90 行)
│       │   ├── defineRenderComponent.ts  # 高层封装 (~80 行)
│       │   ├── event.ts           # 事件系统 (~160 行)
│       │   └── types.ts           # 类型定义 (~20 行)
│       └── components/
│           └── RenderComponent.vue # 渲染组件 (~130 行)
│
└── vite-plugin-uni-render/        # Vite 编译时插件
    └── src/
        ├── index.ts               # 插件主逻辑 (~460 行)
        └── uniRenderCompiler.ts   # SFC 编译器 (~400 行)
```

---

## 🔬 核心原理详解

### 1. 小程序的根本限制

小程序采用**双线程架构**：

```
┌──────────────────────┐     setData()      ┌──────────────────────┐
│    逻辑层 (JSCore)    │ ─────────────────→ │    渲染层 (WebView)   │
│                      │ ←───────────────── │                      │
│  - 执行 JavaScript   │      事件回调       │  - 渲染 WXML/WXSS    │
│  - 处理业务逻辑      │                     │  - 处理用户交互      │
└──────────────────────┘                     └──────────────────────┘
```

**关键限制**：`setData()` 只能传递 **纯 JSON 数据**，**不能传递函数**！

这意味着：
- 传统的 Vue 渲染方式（直接操作 DOM）在小程序中不可用
- VNode 中的事件处理函数无法通过 `setData()` 传递到渲染层

### 2. 我们的解决方案

**核心思路**：将 VNode 转换为纯 JSON（RenderNode），用 `eventId` 替代函数引用。

```
┌─────────────────┐                    ┌─────────────────┐
│     VNode       │                    │   RenderNode    │
├─────────────────┤     转换           ├─────────────────┤
│ type: 'button'  │  ─────────→       │ type: 'button'  │
│ props: {        │                    │ props: {        │
│   onClick: fn   │  ✗ 函数不能传     │   bindtap: '__mp_evt_1__'  │
│ }               │                    │   data-eid-tap: '__mp_evt_1__'
│                 │                    │ }               │
└─────────────────┘                    └─────────────────┘
                                              │
              ┌───────────────────────────────┘
              │
              ▼
┌──────────────────────────────────────────────┐
│           全局事件注册表 (Event Registry)      │
├──────────────────────────────────────────────┤
│  '__mp_evt_1__' → () => count.value++        │
│  '__mp_evt_2__' → (e) => handleInput(e)      │
└──────────────────────────────────────────────┘
```

---

## 🔧 运行时实现

### 3. Vue Custom Renderer

Vue 3 提供了 `createRenderer` API，允许我们自定义渲染目标。我们用它来将 VNode 渲染为 `RenderNode`。

**核心代码** (`customRenderer.ts`)：

```typescript
import { createRenderer } from '@vue/runtime-core'

// 创建 Custom Renderer
const nodeOps = {
  createElement(type: string): InternalNode {
    // 将 HTML 标签映射为 UniApp 标签
    const normalizedType = TAG_MAP[type] || type  // div→view, span→text
    return reactive({
      id: ++nodeIdCounter,
      type: normalizedType,
      props: {},
      children: []
    })
  },

  // 处理属性（关键：事件转换）
  patchProp(el, key, prevValue, nextValue) {
    if (key.startsWith('on') && typeof nextValue === 'function') {
      // onClick → bindtap，并注册到全局事件表
      const eventId = registerEvent(nextValue, scopeId)
      el.props[`bind${mappedEvent}`] = eventId
      el.props[`data-eid-${mappedEvent}`] = eventId
    }
  }
  // ... insert, remove, setText 等操作
}

const { createApp } = createRenderer(nodeOps)
```

### 4. 双 Map 事件系统

事件系统采用**双 Map 架构**，实现页面级别的事件隔离：

```typescript
// event.ts

// 全局事件表：eventId → handler
const eventRegistry = new Map<string, Function>()

// 作用域事件表：scopeId → Set<eventId>（用于组件卸载时清理）
const scopeRegistry = new Map<string, Set<string>>()

// 注册事件
export function registerEvent(handler: Function, scopeId?: string): string {
  const eventId = `__mp_evt_${++counter}__`
  eventRegistry.set(eventId, handler)
  
  // 记录到作用域，便于组件卸载时批量清理
  if (scopeId) {
    scopeRegistry.get(scopeId)?.add(eventId)
  }
  return eventId
}

// 触发事件（由 RenderComponent 调用）
export function renderEvent(eventId: string, event?: any): void {
  const handler = eventRegistry.get(eventId)
  if (handler) handler(event)
}

// 清理作用域内所有事件
export function clearEventScope(scopeId: string): void {
  const eventIds = scopeRegistry.get(scopeId)
  eventIds?.forEach(id => eventRegistry.delete(id))
  scopeRegistry.delete(scopeId)
}
```

### 5. RenderComponent - 动态渲染组件

这是整个方案的**基础组件**，负责将 `RenderNode` 递归渲染为 UniApp 原生组件：

```vue
<!-- RenderComponent.vue -->
<template>
  <template v-if="nodeToRender">
    <!-- view 容器 -->
    <view v-if="nodeToRender.type === 'view'"
      :class="nodeToRender.props?.class"
      :style="nodeToRender.props?.style"
      @tap="onTap">
      <render-component v-for="child in nodeToRender.children"
        :key="child.id" :node="child" />
    </view>

    <!-- button 按钮 -->
    <button v-else-if="nodeToRender.type === 'button'" @tap="onTap">
      <render-component v-for="child in nodeToRender.children"
        :key="child.id" :node="child" />
    </button>

    <!-- 其他类型... -->
  </template>
</template>

<script lang="ts">
import { renderEvent } from 'uni-render'

export default {
  props: { node: Object },
  setup(props) {
    function onTap(e) {
      const eventId = props.node?.props?.['data-eid-tap']
      if (eventId) renderEvent(eventId, e)
    }
    return { onTap }
  }
}
</script>
```

---

## ⚙️ 编译时实现

### 6. 为什么需要编译时处理？

UniApp 内置了一套 Vue，而我们的 Custom Renderer 也需要使用 Vue。如果两套 Vue 混用，会导致：

1. **响应式系统冲突**：两个 Vue 实例的 `ref`、`reactive` 互不兼容
2. **VNode 类型不匹配**：不同 Vue 版本的 VNode 结构可能不同
3. **运行时错误**：`Cannot read properties of null (reading 'isCE')` 等

**解决方案**：在编译时将用户代码中的 `import 'vue'` 替换为 `import 'uni-render'`，确保使用统一的 Vue 实例。

### 7. Vite 插件三大钩子

```
                    用户代码导入
                         │
                         ▼
                   ┌──────────┐
                   │ resolveId │  ← 模块解析与重定向
                   └──────────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
    非 Page .vue    import 'vue'    Page .vue
    → 虚拟模块       → uni-render    → transform
         │               │               │
         ▼               │               ▼
   ┌──────────┐          │        ┌──────────┐
   │   load   │          │        │ transform │
   └──────────┘          │        └──────────┘
   返回 TS 代码          │        修改 SFC 代码
         │               │               │
         └───────────────┴───────────────┘
                         │
                         ▼
                    最终代码输出
```

### 8. 虚拟模块技术

**问题**：UniApp 会处理所有 `.vue` 文件，但我们希望非 Page 组件完全使用自己的渲染器。

**解决方案**：使用 Vite 虚拟模块，将 `.vue` 导入重定向到虚拟的 `.ts` 模块。

```typescript
// resolveId 钩子
resolveId(source, importer) {
  if (source.endsWith('.vue') && !isPageComponent(source)) {
    // 将 ./HelloWorld.vue 重定向到虚拟模块
    // \0 前缀是 Vite 虚拟模块约定
    return '\0uni-render:' + fullPath.replace('.vue', '.vue.render.ts')
  }
}

// load 钩子
load(id) {
  if (id.startsWith('\0uni-render:')) {
    // 读取原始 .vue 文件
    const code = readFileSync(originalPath, 'utf-8')
    // 转换为纯 TypeScript + 渲染函数
    const tsCode = transformVueSFC(code, false)
    return tsCode
  }
}
```

**效果**：UniApp 看到的是 `.ts` 文件，不会对其进行 SFC 编译处理。

### 9. Page 组件的特殊处理

Page 组件需要 UniApp 处理路由、生命周期等，因此必须保持 `.vue` 格式。

**转换前**：
```vue
<script lang="ts">
import { defineComponent, h, ref } from 'vue'

export default defineComponent({
  setup() {
    const count = ref(0)
    return () => h('view', {}, `count: ${count.value}`)
  }
})
</script>
```

**转换后**：
```vue
<template>
  <render-component :node="node" />
</template>

<script lang="ts">
import { defineRenderComponent, h, ref } from 'uni-render'

export default defineRenderComponent({
  setup() {
    const count = ref(0)
    return () => h('view', {}, `count: ${count.value}`)
  }
})
</script>
```

**关键变化**：
1. `import 'vue'` → `import 'uni-render'`
2. `defineComponent` → `defineRenderComponent`
3. 添加 `<template><render-component :node="node" /></template>`

---

## 🔄 完整数据流

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              开发者编写代码                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  编译时 (vite-plugin-uni-render)                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ 1. 解析 pages.json，识别 Page 组件                                       ││
│  │ 2. 拦截 .vue 导入：                                                      ││
│  │    - Page → transform 钩子修改                                          ││
│  │    - 非 Page → resolveId 重定向到虚拟模块                                ││
│  │ 3. 替换 import 'vue' → import 'uni-render'                              ││
│  │ 4. 添加 defineRenderComponent 包装                                       ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  运行时 - 逻辑层 (JSCore)                                                    │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ 1. defineRenderComponent 包装组件                                        ││
│  │ 2. render() 使用 Custom Renderer 渲染用户组件                            ││
│  │ 3. h() → VNode → InternalNode（响应式）                                  ││
│  │ 4. 事件处理器注册到全局事件表，获得 eventId                               ││
│  │ 5. InternalNode → RenderNode（纯 JSON）                                  ││
│  │ 6. watch() 监听 RenderNode 变化                                          ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                           setData({ node: RenderNode })
                           ← 纯 JSON，可安全传递
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  运行时 - 渲染层 (WebView)                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ 1. RenderComponent 接收 RenderNode                                       ││
│  │ 2. 根据 node.type 渲染对应的 UniApp 原生组件                             ││
│  │ 3. 用户点击 → 获取 data-eid-tap → renderEvent(eventId)                   ││
│  │ 4. renderEvent 从全局事件表查找并执行 handler                            ││
│  │ 5. handler 修改响应式数据 → 触发重新渲染                                 ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🏷️ 标签映射表

### HTML → UniApp 标签转换

| HTML 标签 | UniApp 标签 | 说明 |
|---------|------------|------|
| `div` | `view` | 块级容器 |
| `span` | `text` | 行内文本 |
| `p` | `view` | 段落 |
| `img` | `image` | 图片 |
| `a` | `navigator` | 链接 |
| `h1`~`h6` | `view` | 标题 |
| `code` | `text` | 代码 |

### Vue 事件 → 小程序事件

| Vue 事件 | 小程序事件 |
|----------|-----------|
| `onClick` | `bindtap` |
| `onTap` | `bindtap` |
| `onLongPress` | `bindlongpress` |
| `onInput` | `bindinput` |
| `onChange` | `bindchange` |
| `onFocus` | `bindfocus` |
| `onBlur` | `bindblur` |

---

## 💡 关键设计决策

### 1. 为什么用 eventId 而不是函数序列化？

小程序 `setData()` 无法传递函数。我们用 `eventId` 作为函数引用：
- 逻辑层：`eventId → handler` 存储在全局 Map
- 渲染层：触发事件时传递 `eventId`，逻辑层查表执行

### 2. 为什么需要作用域隔离？

多页面/多组件场景下，需要在组件卸载时清理关联的事件：
- 每个 `render()` 调用创建一个作用域
- 组件卸载时，清理该作用域下所有事件

### 3. 为什么 Page 和非 Page 组件处理方式不同？

| 类型 | 处理方式 | 原因 |
|------|---------|------|
| Page | 保持 `.vue` | 需要 UniApp 处理路由、生命周期 |
| 非 Page | 转为虚拟 `.ts` | 完全绕过 UniApp SFC 编译 |

### 4. 为什么用虚拟模块？

虚拟模块（`\0` 前缀）是 Vite 内部约定：
- Vite 认为这是内部模块，不会做额外处理
- UniApp 的 Vue 插件也不会介入
- 我们可以完全控制模块内容

---

## 🌍 平台兼容性

| 平台 | 支持状态 | 说明 |
|------|---------|------|
| H5 | ✅ 完全支持 | 主要开发平台 |
| 微信小程序 | ✅ 完全支持 | 核心目标平台 |
| 支付宝小程序 | ✅ 支持 | 同微信小程序 |
| 其他小程序 | ✅ 支持 | 理论上兼容 |

---

## 📝 总结

**uni-render** 通过以下技术实现了在 UniApp 中使用 Vue 渲染函数：

1. **Vue Custom Renderer**：将 `h()` 渲染为 RenderNode（纯 JSON）
2. **eventId 事件映射**：用字符串 ID 替代函数引用，兼容 setData
3. **RenderComponent**：递归渲染 RenderNode 为 UniApp 原生组件
4. **Vite 虚拟模块**：绕过 UniApp 对非 Page 组件的 SFC 编译
5. **编译时转换**：自动替换 `vue` → `uni-render`，添加包装函数

整个项目**核心代码不超过 1000 行**，却实现了完整的渲染函数支持。

---

## 🔗 相关链接

- [GitHub 仓库](https://github.com/alamhubb/uni-render)
- [模板项目](https://github.com/alamhubb/uni-render-template)
- [npm: uni-render](https://www.npmjs.com/package/uni-render)
- [npm: vite-plugin-uni-render](https://www.npmjs.com/package/vite-plugin-uni-render)
- [npm: create-uni-render](https://www.npmjs.com/package/create-uni-render)

---

**Made with ❤️ by [AlamHubb](https://github.com/alamhubb)**
