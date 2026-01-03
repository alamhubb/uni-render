# uniapp-vue

> UniApp 编译器 + 原生 Vue 3 - 让标准 Vue 3 代码运行在小程序平台

## 🎯 核心定位

**uniapp-vue = UniApp 编译器 + 原生 Vue 3**

通过 Vue 3 的 Custom Renderer 机制，让**标准的原生 Vue 3**代码能够在小程序环境运行。

**关键特性**：
- ✅ 使用**原生 Vue 3** (`@vue/runtime-core`)
- ✅ **标准 Vue 3 API**，完全兼容 Vue 3 生态
- ✅ 通过 Custom Renderer 适配小程序平台

**无论开发还是生产，都需要 uniapp-vue 作为底层运行时。**

### 与 miniprogram-web 的关系

**uniapp-vue** 是底层运行时，**开发和生产都必需**：
- ✅ **开发时**：提供 Custom Renderer，配合 miniprogram-web 在浏览器预览
- ✅ **生产时**：提供 Custom Renderer，打包到真实小程序平台运行

**miniprogram-web** 是开发工具，**仅开发时使用**：
- ✅ **开发时**：wxml-compiler + 浏览器模拟，让你在浏览器中调试
- ❌ **生产时**：不需要，直接运行在真实小程序平台

## 📐 架构原理

### 小程序平台架构（生产环境）

```
Vue 3 组件
  ↓
uniapp-vue
  ├─ @vue/runtime-core (原生 Vue 3 响应式)
  └─ Custom Renderer (小程序适配层)
  ↓
WXML 渲染
  ├─ vnodeTree 数据结构
  └─ render.wxml 递归模板
  ↓
小程序原生渲染
```

**核心依赖**：
- `@vue/runtime-core` - Vue 3 核心响应式系统
- **不需要** `@vue/runtime-dom` - 小程序没有 DOM

### 完整流程（开发和生产共用）


```
┌────────────────────────────────────┐
│         Vue 3 用户代码               │
│   <template>, setup(), reactive    │
└────────────────┬───────────────────┘
                 ↓
┌────────────────────────────────────┐
│   [uniapp-vue] Custom Renderer     │  ← 开发和生产都必需
│    替换 Vue 的 DOM 渲染器           │
└────────────────┬───────────────────┘
                 ↓
┌────────────────────────────────────┐
│   [uniapp-vue] MPNode 虚拟树        │
│   { type: 'view', props: {...} }   │
└────────────────┬───────────────────┘
                 ↓
┌────────────────────────────────────┐
│   [uniapp-vue] serialize 序列化     │
└────────────────┬───────────────────┘
                 ↓
┌────────────────────────────────────┐
│   [uniapp-vue] setData 同步数据     │
└────────────────┬───────────────────┘
                 ↓
        ┌────────┴────────┐
        ↓                 ↓
┌───────────────┐   ┌───────────────────┐
│  生产环境       │   │   开发环境         │
│               │   │                   │
│  真实小程序    │   │ [miniprogram-web]      │  ← 仅开发时需要
│  原生渲染      │   │ wxml-compiler     │
│               │   │ WXML → h() → DOM  │
└───────────────┘   └───────────────────┘
```

### 为什么需要 render.wxml？

**render.wxml 是 Custom Renderer 架构的关键输出层**，它定义了 vnodeTree 数据结构如何在小程序中被渲染。

#### 工作原理

1. **Custom Renderer 生成数据**：
   ```javascript
   // Vue 组件经过 Custom Renderer 处理后
   setData({
     vnodeTree: {
       type: 'view',
       props: { class: 'container' },
       children: [...]
     }
   })
   ```

2. **render.wxml 递归渲染数据**：
   ```xml
   <!-- templates/render.wxml -->
   <template name="node">
     <view wx:if="{{node.type === 'view'}}" 
           class="{{node.props.class}}">
       <block wx:for="{{node.children}}">
         <template is="node" data="{{node: item}}"/>
       </block>
     </view>
     <!-- 其他节点类型... -->
   </template>
   ```

3. **页面引用模板**：
   ```xml
   <!-- pages/index/index.wxml -->
   <import src="/templates/render.wxml"/>
   <template is="node" data="{{node: vnodeTree}}"/>
   ```

#### 为什么在 uniapp-vue 中？

- ✅ **核心运行时的一部分**：render.wxml 定义了 vnodeTree 的渲染规则，是 Custom Renderer 的输出层
- ✅ **开发和生产都需要**：
  - 真实小程序：直接使用 render.wxml 渲染
  - 浏览器开发：miniprogram-web 编译 render.wxml 为 h() 函数后渲染
- ✅ **数据结构契约**：它定义了 MPNode 序列化后的数据格式，与 Custom Renderer 紧密耦合


## 🚀 核心功能

### 1. Vue 3 Custom Renderer

使用 `@vue/runtime-core` 的 `createRenderer` API，创建专门针对小程序的自定义渲染器。

```typescript
import { createApp } from 'uniapp-vue'

const app = createApp(App)
app.mount('#app')  // 渲染到小程序
```

### 2. MPNode 虚拟树

所有 Vue 组件都会被渲染成 MPNode 虚拟节点树，而不是 DOM 节点：

```typescript
// Vue template
<view class="container">
  <text>{{ message }}</text>
</view>

// 转换为 MPNode
{
  type: 'view',
  props: { class: 'container' },
  children: [
    { type: 'text', children: [message] }
  ]
}
```

### 3. 事件系统

提供小程序事件的绑定和触发机制：

```typescript
import { eventBus, bindNodeEvent } from 'uniapp-vue'

// 绑定事件
bindNodeEvent(node, 'tap', handler)

// 触发事件
eventBus.emit('tap', eventData)
```

### 4. 生命周期兼容

支持小程序特有的生命周期钩子：

```typescript
import { onLaunch, onShow, onHide } from 'uniapp-vue'

onLaunch(() => {
  console.log('小程序启动')
})

onShow(() => {
  console.log('小程序显示')
})
```

### 5. uni-app API 兼容

提供 uni-app 编译器需要的辅助函数：

```typescript
import { t, o, injectHook } from 'uniapp-vue'

// 文本处理
const text = t(value)

// 事件处理
const handler = o(fn)

// 钩子注入
injectHook('mounted', callback)
```

## 📦 项目结构

```
uniapp-vue/
├── uniapp-vue/                      # 核心运行时包
│   ├── src/
│   │   ├── renderer/                # Custom Renderer 实现
│   │   │   ├── nodeOps.ts           # MPNode 操作
│   │   │   ├── serialize.ts         # 序列化
│   │   │   └── index.ts             # createApp 等
│   │   └── events/                  # 事件系统
│   ├── templates/                   # WXML 渲染模板
│   │   └── render.wxml              # vnodeTree 递归渲染模板
│   └── index.ts                     # 导出 Vue 3 API
├── vite-plugin-uniappvue/           # Vite 插件（独立包）
│   ├── index.ts                     # 设置 Vue alias
│   └── package.json                 # 独立发布配置
└── vite-plugin-uniappvue-compiler/  # 编译器插件（独立包）
    ├── index.ts                     # 处理空 WXML
    └── package.json                 # 独立发布配置
```

### Vite 插件说明

**vite-plugin-uniappvue** 和 **vite-plugin-uniappvue-compiler** 是独立的 npm 包：
- ✅ 可以单独安装和使用
- ✅ 使用包名引用 `'uniapp-vue'`，由 mono 或 node_modules 解析
- ✅ 不依赖相对路径，更清晰的模块边界

### templates/render.wxml

这是 Custom Renderer 的**渲染输出层**，定义了序列化后的 vnodeTree 如何在小程序中渲染。

**使用场景**：
- **真实小程序**：页面直接引用 render.wxml 渲染 vnodeTree
- **浏览器开发**：miniprogram-web 编译 render.wxml 为 h() 函数

**重要性**：它是连接 Custom Renderer（数据层）和小程序渲染（视图层）的桥梁。

## 🔧 使用方式

### 1. 安装依赖

```bash
npm install uniapp-vue
```

### 2. 编写 Vue 3 代码

```vue
<template>
  <view class="container">
    <text>{{ message }}</text>
    <button @tap="handleClick">点击</button>
  </view>
</template>

<script setup>
import { ref } from 'uniapp-vue'

const message = ref('Hello MiniProgram')

const handleClick = () => {
  message.value = 'Clicked!'
}
</script>
```

### 3. 配置 Vite

```javascript
// vite.config.js
import { defineConfig } from 'vite'
import { uniappVue } from 'vite-plugin-uniappvue'

export default defineConfig({
  plugins: [
    uniappVue()
  ]
})
```

### 4. 打包到小程序

```bash
npm run build:mp-weixin  # 微信小程序
npm run build:mp-alipay  # 支付宝小程序
```

## 🎨 导出的 API

### Vue 3 核心 API

所有 `@vue/runtime-dom` 的 API 都可用：

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

### 自定义 API

```typescript
import {
  // 应用创建 (覆盖默认)
  createApp, createSSRApp,
  
  // 类型
  MPNode, SerializedNode,
  
  // 事件系统
  eventBus, bindNodeEvent, triggerNodeEvent,
  
  // 小程序生命周期
  onLaunch, onShow, onHide,
  
  // 工具函数
  t, o, injectHook
} from 'uniapp-vue'
```

## 🔗 与 miniprogram-web 的关系

**核心理解**：
- **uniapp-vue** = 底层运行时，开发和生产都需要
- **miniprogram-web** = 开发工具，仅开发时额外添加浏览器渲染层

**开发流程**：

```bash
# 开发调试（浏览器预览）
npm run dev:mp-h5
# ↓ 使用：
# - uniapp-vue (Custom Renderer)
# - miniprogram-web (wxml-compiler + 浏览器模拟)

# 生产打包（真实小程序）
npm run build:mp-weixin
# ↓ 使用：
# - uniapp-vue (Custom Renderer)
# - 不需要 miniprogram-web
```

## 🌟 核心特性

- ✅ **完整的 Vue 3 支持** - 使用 Composition API、`<script setup>` 等现代语法
- ✅ **多平台支持** - 微信、支付宝、百度、抖音等小程序平台
- ✅ **类型安全** - 完整的 TypeScript 类型定义
- ✅ **高性能** - 基于 Vue 3 的响应式系统和虚拟 DOM diff
- ✅ **开发体验** - 配合 miniprogram-web 实现浏览器热重载调试

## 📄 License

MIT
