# uni-render

[![npm version](https://img.shields.io/npm/v/uni-render.svg)](https://www.npmjs.com/package/uni-render)
[![npm downloads](https://img.shields.io/npm/dm/uni-render.svg)](https://www.npmjs.com/package/uni-render)
[![license](https://img.shields.io/npm/l/uni-render.svg)](https://github.com/AlamHubb/uni-render/blob/main/LICENSE)

让 UniApp 支持 Vue 渲染函数（h 函数）开发，兼容 H5 和微信小程序。

## 🚀 快速开始

### 方式一：使用脚手架（推荐）

```bash
# 创建新项目（不指定项目名时，默认使用 my-uni-render-project）
npx create-uni-render

# 或指定项目名
npx create-uni-render my-app

# 进入项目目录
cd my-uni-render-project

# 安装依赖
npm install

# 启动 H5 开发
npm run dev:h5

# 启动微信小程序开发
npm run dev:mp-weixin
```

### 方式二：在现有项目中安装

```bash
# 安装核心依赖
npm install uni-render vite-plugin-uni-render

# 或使用 pnpm
pnpm add uni-render vite-plugin-uni-render
```

在 `vite.config.ts` 中配置：

```typescript
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

### 编写组件

**Page 组件（pages/index/index.vue）**：
```vue
<template>
  <view>
    <HelloWorld msg="Uniapp + Render" />
  </view>
</template>

<script setup lang="ts">
import HelloWorld from './components/HelloWorld.vue'
</script>
```

**普通组件（components/HelloWorld.vue）**：
```vue
<script setup lang="ts">
import { ref, h } from 'uni-render'

const props = defineProps<{ msg: string }>()
const count = ref(0)

// 使用标准 Vue 渲染函数编写组件
</script>
```

**使用渲染函数的组件示例**：
```typescript
// components/Counter.ts
import { ref, h, defineComponent } from 'uni-render'

export default defineComponent({
  setup() {
    const count = ref(0)
    
    return () => h('view', { class: 'counter' }, [
      h('text', { class: 'title' }, '计数器'),
      h('text', { class: 'count' }, `当前值: ${count.value}`),
      h('button', { 
        onClick: () => count.value++ 
      }, '点击 +1')
    ])
  }
})
```

## 📦 包说明

| 包名 | 说明 | 安装 |
|------|------|------|
| `uni-render` | 核心运行时库，提供 `h`、`ref`、`defineRenderComponent` 等 API | `npm install uni-render` |
| `vite-plugin-uni-render` | Vite 插件，自动转换 Vue 组件 | `npm install vite-plugin-uni-render -D` |
| `create-uni-render` | 项目脚手架，快速创建新项目 | `npx create-uni-render` |

## ✨ 核心特性

- ✅ **标准 Vue 语法**：使用 `h` 函数编写组件，无需学习 UniApp 模板语法
- ✅ **自动转换**：插件自动处理 `vue → uni-render` 导入转换
- ✅ **兼容小程序**：支持微信小程序、支付宝小程序等
- ✅ **响应式支持**：完整的 Vue 3 响应式系统
- ✅ **零配置**：开箱即用，无需额外配置

---

## 📖 详细文档

将 Vue 渲染函数组件转换为 UniApp 兼容格式的工具链。

## 核心概念

本项目的目标是让开发者能够使用 Vue 的 `h` 函数（渲染函数）来编写 UniApp 组件，而不是使用 UniApp 的模板语法。

通过自定义渲染器 (`@vue/runtime-core`)，我们将 VNode 树转换为 `RenderNode` 数据结构，然后由 `RenderComponent` 渲染到真正的 UniApp 组件。

## 文件处理规则

### vite-plugin-uni-render 处理规则

| 文件类型 | 输出格式 | 处理方式 |
|---------|---------|---------|
| `main.ts` | 不处理 | UniApp 入口文件，需要真正的 `vue` |
| 其他 `.ts` 文件 | `.ts` | 替换 `import from 'vue'` → `import from 'uni-render'` |
| Page `.vue` (pages.json 配置) | `.vue` | `transform` hook：编译 + `defineRenderComponent` + `<render-component>` template |
| 非 Page `.vue` | **虚拟模块 `.ts`** | `resolveId` 拦截 → 虚拟模块 → 纯 `.ts` + CSS 虚拟模块 |

### 详细说明

#### 1. `main.ts` - 不处理
UniApp 的入口文件，需要使用真正的 `vue` 包（`createSSRApp`）。

#### 2. 其他 `.ts` 文件
所有 `src/` 目录下的 `.ts` 文件（除 `main.ts`）都会被处理：
- 将 `import { xxx } from 'vue'` 替换为 `import { xxx } from 'uni-render'`

#### 3. Page 组件（`.vue`）
在 `pages.json` 中配置的页面组件：
- 保持 `.vue` 格式
- template 会被编译为渲染函数
- 使用 `defineRenderComponent` 包装
- 添加 `<render-component :node="node" />` 作为新的 template

#### 4. 非 Page 组件（虚拟模块）
不在 `pages.json` 中配置的 `.vue` 文件（包括 node_modules 中的）：
- **`resolveId` hook 拦截**：将 `.vue` 导入重定向到虚拟模块 ID（`\0uni-render:xxx.ts`）
- **`load` hook 返回**：编译后的纯 `.ts` 代码
- **CSS 虚拟模块**：样式提取为独立虚拟模块（`virtual:unirender-css:xxx.vue.css`）
- UniApp 不会处理虚拟模块（以 `\0` 开头）

### `.vue` 文件两步处理

1. **合并 template 和 script**：
   - 有 template + 无渲染函数 → template 转为 render 函数
   - 有 template + 有渲染函数 → 抛弃 template，保留渲染函数
   - 无 template + 有渲染函数 → 直接用渲染函数

2. **输出格式**：
   - Page → `.vue`（带 `<render-component>` template）
   - Component → `.ts`（纯 TypeScript）

## 📁 项目结构

```
uni-render/
├── uni-render/              # 核心运行时库
│   ├── src/
│   │   ├── index.ts         # 导出所有 API
│   │   ├── renderer/        # 自定义渲染器
│   │   ├── components/      # 运行时组件
│   │   └── event/           # 事件系统
│
├── vite-plugin-uni-render/  # Vite 插件
│   └── src/
│       ├── index.ts         # 插件入口
│       └── uniRenderCompiler.ts  # 编译器
│
├── create-uni-render/       # 项目脚手架
│   ├── bin/
│   │   └── index.js         # 脚手架脚本
│   └── template/            # 项目模板
│
└── my-vue3-project/         # 示例项目
```

## 虚拟模块架构

### 为什么使用虚拟模块？
UniApp 的 Vite 插件会处理所有 `.vue` 文件。为了让非 Page 组件使用我们的 custom renderer 而不是 UniApp，我们使用虚拟模块绕过 UniApp 的处理。

### 虚拟模块 ID 规范

| 类型 | import 语句 | 内部虚拟模块 ID |
|-----|------------|----------------|
| 组件 TS | `import XXX from './HelloWorld.vue'` | `\0uni-render:D:/.../HelloWorld.ts` |
| 组件 CSS | `import 'virtual:unirender-css:xxx.vue.css'` | `\0unirender-css:xxx.vue.css` |

- `\0` 前缀是 Vite 虚拟模块约定
- 使用完整绝对路径，避免冲突
- `.ts` / `.css` 后缀让 Vite 正确识别模块类型

## 使用方式

### 1. 安装依赖

```bash
npm install uni-render vite-plugin-uni-render
```

### 2. 配置 vite.config.ts

```typescript
import uniRender from 'vite-plugin-uni-render'

export default defineConfig({
  plugins: [
    uniRender({ debug: true }),  // 可选：打印转换日志
    // ... 其他插件
  ]
})
```

### 3. 编写组件

**Page 组件（pages/index/index.vue）**
```vue
<template>
  <view class="container">
    <HelloWorld msg="Uniapp + Render" />
  </view>
</template>

<script setup lang="ts">
import HelloWorld from './components/HelloWorld.vue'
</script>
```

**普通组件（components/HelloWorld.vue）**
```vue
<script setup lang="ts">
import { ref, h } from 'uni-render'

const props = defineProps<{ msg: string }>()
const count = ref(0)

// 使用标准 Vue 语法，插件会自动处理转换
</script>
```

**使用渲染函数的组件（components/Counter.ts）**
```typescript
import { ref, h, defineComponent } from 'uni-render'

export default defineComponent({
  setup() {
    const count = ref(0)
    
    return () => h('view', { class: 'counter' }, [
      h('text', { class: 'title' }, '计数器'),
      h('text', { class: 'count' }, `当前值: ${count.value}`),
      h('button', { 
        onClick: () => count.value++ 
      }, '点击 +1')
    ])
  }
})
```

## ⚙️ 配置选项

### vite-plugin-uni-render 选项

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `debug` | `boolean` | `false` | 是否开启调试日志，打印转换过程 |

```typescript
uniRender({
  debug: true  // 开启调试模式
})
```

## ⚠️ 注意事项

1. **导入来源**：在组件中使用 `import { ref, h } from 'uni-render'`，插件会自动处理 `vue → uni-render` 的转换

2. **样式处理**：非 Page 的 `.vue` 组件样式通过 CSS 虚拟模块处理，会自动注入到页面中

3. **响应式系统**：`ref`、`reactive` 等 API 从 `uni-render` 导入，使用完整的 Vue 3 响应式系统

4. **事件处理**：使用 `onClick`、`onInput` 等 Vue 风格的事件名，会自动转换为 UniApp 的事件格式

5. **Vue 版本**：要求 Vue 3.4.x 版本，确保兼容性

## 🔗 相关链接

- [uni-render 运行时库文档](./uni-render/README.md)
- [vite-plugin-uni-render 插件文档](./vite-plugin-uni-render/README.md)
- [create-uni-render 脚手架文档](./create-uni-render/README.md)
- [GitHub Issues](https://github.com/AlamHubb/uni-render/issues)

## 🏷️ 标签映射表

### customRenderer 标签转换（第一层）

在 Custom Renderer 中，HTML 标签会被转换为 UniApp 兼容的标签类型：

| HTML 标签 | → UniApp 类型 | 说明 |
|---------|--------------|-----|
| `div` | `view` | 块级容器 |
| `p` | `view` | 段落，作为块级元素处理 |
| `span` | `text` | 行内文本 |
| `img` | `image` | 图片 |
| `a` | `navigator` | 链接/导航 |
| `code` | `text` | 代码文本 |
| `h1`~`h6` | 原样保留 | 进入默认处理，渲染为 view |
| `view` | `view` | 保持不变 |
| `text` | `text` | 保持不变 |
| `image` | `image` | 保持不变 |
| `button` | `button` | 保持不变 |
| `input` | `input` | 保持不变 |
| `navigator` | `navigator` | 保持不变 |
| 其他 | 原样保留 | 进入 RenderComponent 默认处理 |

### RenderComponent 渲染（第二层）

RenderComponent 根据节点的 `type` 值渲染对应的 UniApp 组件：

| type 值 | 渲染为 | 特殊处理 |
|--------|-------|---------|
| `view` | `<view>` | 支持 tap、longpress 事件 |
| `text` | `<text>` | 支持文本内容和子节点 |
| `#text` | `<text>` | 纯文本节点 |
| `button` | `<button>` | 支持 type 属性 |
| `input` | `<input>` | 支持 input、focus、blur 事件 |
| `image` | `<image>` | 默认 mode="scaleToFill" |
| 其他（默认） | `<view>` | 未知类型统一渲染为 view |

## 📄 License

MIT

---

**Made with ❤️ by [AlamHubb](https://github.com/AlamHubb)**

