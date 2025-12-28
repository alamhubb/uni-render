# uni-app-render

**让 uni-app 支持 Vue 3 渲染函数（h 函数）开发**

## 🎯 核心定位

uni-app-render 是一个**可选的增强库**，让开发者可以在小程序中使用 Vue 3 的渲染函数（h 函数）进行开发。

**注意**：这不是 miniapp-runtime 的必需依赖，而是一个独立的增强功能。

## 📦 包结构

```
uni-app-render/
├── packages/
│   ├── uniapp-vue-adapter/          # 基础适配层
│   │   ├── src/index.ts             # 导出官方 Vue 3 API + 适配函数
│   │   └── package.json
│   │
│   └── uniapp-vue-render/           # 渲染层
│       ├── src/
│       │   ├── index.ts             # 重新导出 adapter + 自定义渲染器
│       │   ├── renderer/            # 自定义渲染器实现
│       │   ├── dom/                 # MPDocument 实现
│       │   ├── hook/                # 钩子系统
│       │   ├── components/          # Render 组件等
│       │   ├── lifecycle/           # 生命周期
│       │   └── mp/                  # 小程序特定功能
│       └── package.json             # 依赖 uniapp-vue-adapter
```

## 🏗️ 架构设计

### 包依赖关系

```
uniapp-vue-adapter（基础层）
  ├─ 导出官方 Vue 3 API
  ├─ 提供 o(), t() 等适配函数
  └─ 提供小程序生命周期钩子

uniapp-vue-render（渲染层）
  ├─ 依赖 uniapp-vue-adapter
  ├─ 导出自定义渲染器
  ├─ 导出 MPDocument
  └─ 导出 <Render> 组件
```

### 与 miniapp-runtime 的关系

```
miniapp-runtime（基础运行时）
  ├─ 使用 uniapp-vue-adapter
  ├─ 官方 Vue 3 + 标准 DOM 渲染器
  └─ 不依赖 uniapp-vue-render

uni-app-render（可选增强）
  ├─ 可以配合 miniapp-runtime 使用
  └─ 也可以在真实小程序中使用
```

## 🔄 工作原理

### 在真实小程序中

```
用户代码（使用 h 函数）
  ↓
自定义渲染器（渲染到 MPDocument）
  ↓
MPDocument（模拟 DOM）
  ↓
setData 传递数据
  ↓
小程序原生组件渲染
```

### 在浏览器中（配合 miniapp-runtime）

```
用户代码（使用 h 函数）
  ↓
自定义渲染器（渲染到 MPDocument）
  ↓
MPDocument（模拟 DOM）
  ↓
模拟 setData（直接渲染）
  ↓
浏览器 DOM
```

## 📚 使用指南

### 安装

```bash
npm install uniapp-vue-render
```

### 基本用法

```vue
<template>
  <button @click="handleRender">渲染组件</button>
  <Render @mounted="handleMounted" />
</template>

<script setup lang="ts">
import { h, ref } from 'uniapp-vue-render'
import { Render, View, Text, Button } from 'uniapp-vue-render'
import type { VueRender } from 'uniapp-vue-render'

const renderRef = ref<VueRender>()

const handleMounted = (render: VueRender) => {
  renderRef.value = render
}

const handleRender = () => {
  const count = ref(0)
  
  // 使用 Vue 的 h 函数创建组件
  const Counter = () => h(View, { class: 'counter' }, [
    h(Text, null, `计数: ${count.value}`),
    h(Button, { onClick: () => count.value++ }, '增加'),
    h(Button, { 
      onClick: () => renderRef.value?.unmount(id) 
    }, '关闭')
  ])
  
  const id = renderRef.value?.render(h(Counter))
}
</script>
```

### 使用 defineComponent

```typescript
import { h, ref, defineComponent } from 'uniapp-vue-render'
import { Render, View, Text, Button } from 'uniapp-vue-render'

const TodoList = defineComponent({
  props: {
    items: {
      type: Array as PropType<string[]>,
      required: true
    }
  },
  setup(props) {
    return () => h(View, { class: 'todo-list' },
      props.items.map(item => 
        h(Text, { key: item }, item)
      )
    )
  }
})
```

## 🎨 特性

- 🚀 **零额外依赖** - 完全复用 uni-app 已有的 Vue 3 运行时
- 📦 **超小体积** - 仅增加 ~30KB 的 DOM 模拟层
- 🔧 **Vite 插件** - 一行配置即可使用
- 💪 **完整 Vue 3 支持** - ref、reactive、computed、watch 全部可用
- 🌍 **跨平台** - 支持微信/支付宝/H5/APP

## 🔧 配置

在 `vite.config.ts` 中添加插件：

```typescript
import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'
import { uniAppRender } from 'uni-app-render/plugin'

export default defineConfig({
  plugins: [
    uniAppRender(),  // 添加这一行
    uni(),
  ],
})
```

在 `pages.json` 中添加全局组件（小程序端需要）：

```json
{
  "globalStyle": {
    "usingComponents": {
      "document": "/document"
    }
  }
}
```

## 📚 相关项目

- **miniapp-runtime**：小程序运行时，使用 uniapp-vue-adapter
- **uniapp-mp**：测试项目
- **vite-plugin-mp**：Vite 插件

详见：[../miniapp-web/ARCHITECTURE.md](../miniapp-web/ARCHITECTURE.md)

## 🤝 贡献

欢迎贡献代码！请遵循以下原则：

1. 可以添加 Vue 相关的增强功能
2. 确保在真实小程序和浏览器中都能工作
3. 保持与 miniapp-runtime 的独立性
4. 添加测试用例

## 📄 许可证

MIT
