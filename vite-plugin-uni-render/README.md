# vite-plugin-uni-render

[![npm version](https://img.shields.io/npm/v/vite-plugin-uni-render.svg)](https://www.npmjs.com/package/vite-plugin-uni-render)
[![npm downloads](https://img.shields.io/npm/dm/vite-plugin-uni-render.svg)](https://www.npmjs.com/package/vite-plugin-uni-render)
[![license](https://img.shields.io/npm/l/vite-plugin-uni-render.svg)](https://github.com/AlamHubb/uni-render/blob/main/LICENSE)

> Vite 插件 - 让标准 Vue 组件在 UniApp 中使用 render 函数

## 核心功能

在 UniApp H5 平台中，允许你使用**标准 Vue 3 的 render 函数**编写组件，无需手动适配 UniApp 的 SFC 编译器。

**你只需要写标准 Vue 代码**：
```vue
<script setup lang="ts">
import { ref, h } from 'vue'

const count = ref(0)

// 标准 Vue 写法，什么都不用改
</script>
```

**插件自动帮你处理**：
- 在 compiler 中将 `import 'vue'` 转换为 `import 'uni-render'`
- 非 Page 组件：转换为纯 TypeScript + 渲染函数
- Page 组件：使用 `<render-component :node="node" />` 模板 + `defineRenderComponent` 包装

## 设计理念

### 为什么需要这个插件？

UniApp 的 Vue SFC 编译器对某些标准 Vue 特性支持有限。本插件通过以下策略解决：

| 组件类型 | 处理策略 | 原因 |
|---------|---------|------|
| **Page 组件** | 保持 `.vue` 格式，使用 `<render-component>` 模板 + `defineRenderComponent` | UniApp 需要处理 Page 的路由、生命周期 |
| **非 Page 组件** | 通过虚拟模块转换为 `.render.temp` + `.css` | 完全绕过 UniApp SFC 编译 |
| **纯脚本文件** | 在 resolveId 中重定向 `vue → uni-render` | UniApp 不会在脚本中注入代码 |
| **App.vue** | 不处理 | 保持原始 Vue 行为 |

### 渲染函数处理

无论 Page 还是非 Page，渲染函数的获取逻辑是统一的：
- **有渲染函数**：直接使用用户的渲染函数
- **只有 template**：使用 `@vue/compiler-sfc` 编译成渲染函数

### 核心原则

- **最小侵入**：用户代码保持标准 Vue 写法，零修改
- **按需处理**：只处理需要转换的文件，不影响其他部分
- **缓存优化**：pages.json 只读取一次，转换结果缓存复用

## 工作原理

插件使用 `enforce: 'pre'` 在 UniApp 插件之前执行，通过三个 Vite 钩子协作完成转换：

### 1. `resolveId` 钩子 - 模块解析与重定向

**执行时机**：当 Vite 遇到 `import` 语句时

**处理顺序**（从高到低优先级）：

#### 1.1 处理 `.vue` 文件导入

```typescript
import './Component.vue'
```

- **判断条件**：扩展名为 `.vue`，且不是 `App.vue`
- **Page 组件**：返回 `null`，交给后续钩子处理
- **非 Page 组件**：返回虚拟模块 ID `\0uni-render:D:/xxx/Component.ts`

**为什么要用虚拟模块？**  
一旦返回虚拟 `.ts` ID，Vite 就认为这是 TypeScript 文件，UniApp 的 Vue 插件不会介入，从而绕过 SFC 编译限制。

#### 1.2 处理 `vue` → `uni-render` 重定向（纯脚本文件）

```typescript
// 在 .ts/.js 文件中
import { ref, h } from 'vue'
```

- **判断条件**：
  - `source === 'vue'`
  - importer 是纯脚本文件（`.ts, .js, .mjs, .cjs`）
  - importer 不在 `node_modules`
  - importer 不是入口文件（`main.ts` 等）
- **行为**：重定向到 `uni-render/src/index.ts`

**为什么只处理纯脚本文件，不处理 .vue？**

UniApp 编译 `.vue` 文件的 `<template>` 时，会注入 `import { resolveDynamicComponent } from 'vue'`。如果我们在 resolveId 中拦截所有 `'vue'` 导入，UniApp 注入的代码也会被重定向，导致使用错误的 Vue 运行时 API。

因此：
- **纯脚本文件**：在 resolveId 中重定向（UniApp 不会注入代码）
- **`.vue` 文件**：在 compiler 的 `transformVueSFC` 中处理（只影响用户代码）

#### 1.3 处理 CSS 虚拟模块

```typescript
import 'virtual:unirender-css:/path/to/Component.vue.css'
```

- **判断条件**：`source` 以 `virtual:unirender-css:` 开头且以 `.css` 结尾
- **行为**：返回 `\0unirender-css:...`（Vite 内部虚拟模块格式）

**为什么要两次转换？**  
因为 `\0` 是空字符，不能直接出现在源码中。我们用 `virtual:` 作为用户可见的前缀，在 `resolveId` 中转换为 Vite 识别的 `\0` 前缀。

---

### 2. `load` 钩子 - 虚拟模块内容生成

**执行时机**：Vite 需要加载虚拟模块时

**职责**：为虚拟模块 ID 提供实际内容（因为虚拟模块在文件系统中不存在）

#### 2.1 加载 CSS 虚拟模块

```typescript
// 当 Vite 请求: \0unirender-css:/path/to/Component.vue.css
```

- **流程**：
  1. 从 ID 中提取原始 `.vue` 路径
  2. 检查缓存 `transformedCssCache`
  3. 缓存未命中则读取 `.vue` 文件，用 `@vue/compiler-sfc` 解析
  4. 提取所有 `<style>` 块内容
  5. 返回 CSS 字符串

#### 2.2 加载 `.vue` → `.ts` 虚拟模块

```typescript
// 当 Vite 请求: \0uni-render:/path/to/Component.ts
```

- **流程**：
  1. 从虚拟 ID 恢复原始 `.vue` 路径
  2. 检查缓存 `transformedVueCache`
  3. 缓存未命中则：
     - 读取原始 `.vue` 文件
     - 用 `transformVueSFC(code, false)` 转换为纯 TS 代码
     - 如果有 `<style>`，在 TS 开头添加 `import 'virtual:unirender-css:...'`
  4. 返回最终的 TS 代码

---

### 3. `transform` 钩子 - Page 组件转换

**执行时机**：Vite 加载真实文件后

**职责**：只处理 Page 类型的 `.vue` 文件

- **判断条件**：
  - 扩展名为 `.vue`
  - 不在 `node_modules`
  - 是 `pages.json` 中定义的 Page 组件
- **行为**：
  - 调用 `transformVueSFC(code, true)` 转换
  - 保留 `.vue` 格式，只修改 `<script>` 部分
  - 返回修改后的代码，继续被 UniApp Vue 插件处理

**为什么 Page 不用虚拟模块？**  
因为 Page 需要 UniApp 处理 `<template>`、路由、生命周期等，必须保持 `.vue` 格式。

---

### 完整流程图

```
                    ┌─────────────────────────────────────────┐
                    │            用户代码导入                    │
                    └─────────────────────────────────────────┘
                                        │
                                        ▼
                                  ┌──────────┐
                                  │ resolveId │
                                  └──────────┘
                                        │
        ┌───────────────┬───────────────┼───────────────┐
        ▼               ▼               ▼               ▼
   Page .vue       非Page .vue    import 'vue'     App.vue
   返回 null       → .render.temp  (.ts/.js 文件)   不处理
        │               │         → uni-render       │
        ▼               ▼               │               │
   transform       load 钩子          │               │
   ┌──────────────┐ ┌──────────────┐   │               │
   │ compiler:    │ │ compiler:    │   │               │
   │ - 渲染函数   │ │ - 渲染函数   │   │               │
   │ - vue→uniapp │ │ - vue→uniapp │   │               │
   │ + template   │ │ + CSS import │   │               │
   │ + defineRC   │ └──────────────┘   │               │
   └──────────────┘         │          │               │
        │                   │          │               │
        ▼                   │          │               │
   UniApp 编译              │          │               │
   \<render-component\>       │          │               │
        │                   │          │               │
        └───────────────────┴──────────┴───────────────┘
                                        │
                                        ▼
                                 最终代码输出
```

**说明**：
- **Page .vue**：保持 .vue 格式，使用 `defineRenderComponent` + `<render-component>` 模板
- **非 Page .vue**：转为 `.render.temp` 虚拟模块，绕过 UniApp 编译
- **纯脚本文件**：直接在 resolveId 中重定向 `vue → uni-render`
- **App.vue**：不处理（保持原始 Vue 行为）

## 安装

```bash
pnpm add vite-plugin-uni-render
```

## 使用

在 `vite.config.ts` 中配置：

```typescript
import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'
import { uniRender } from 'vite-plugin-uni-render'

export default defineConfig({
  plugins: [
    // ⚠️ 必须放在 uni() 之前
    uniRender({ debug: true }),
    uni()
  ]
})
```

**⚠️ 重要**：`uniRender()` 必须放在 `uni()` 之前（`enforce: 'pre'` 确保优先执行）。

## 配置选项

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `debug` | `boolean` | `false` | 是否开启调试日志 |

## 转换示例

### 普通组件（非 Page）

**输入（Component.vue）**：
```vue
<script setup lang="ts">
import { ref } from 'vue'
const count = ref(0)
</script>

<template>
  <view>{{ count }}</view>
</template>
```

**转换后**（虚拟 `.ts` 模块）：
```typescript
import { ref } from 'uni-render'
import { defineRenderComponent } from 'uni-render'

const count = ref(0)

export default defineRenderComponent({
  setup() {
    return { count }
  },
  render() {
    // template 转换为 render 函数
  }
})
```

### Page 组件

**输入（pages/index/index.vue）**：
```vue
<script lang="ts">
import { defineComponent, ref, h } from 'vue'

export default defineComponent({
  setup() {
    const count = ref(0)
    return () => h('view', {}, [
      h('text', {}, `count: ${count.value}`),
      h('button', { onClick: () => count.value++ }, '+1')
    ])
  }
})
</script>
```

**transform 钩子处理后**（仍是 `.vue` 格式）：
```vue
<template>
  <render-component :node="node" />
</template>

<script lang="ts">
import { defineRenderComponent, ref, h } from 'uni-render'

export default defineRenderComponent({
  setup() {
    const count = ref(0)
    return () => h('view', {}, [
      h('text', {}, `count: ${count.value}`),
      h('button', { onClick: () => count.value++ }, '+1')
    ])
  }
})
</script>
```

## 注意事项

1. **插件顺序**：必须放在 `uni()` 之前
2. **pages.json 缓存**：启动时读取一次，修改后需重启 Vite
3. **文件排除**：
   - `node_modules` 不处理
   - `App.vue` 不处理
   - 入口文件（`main.ts` 等）不处理
4. **虚拟模块标识**：`\0` 前缀是 Vite 内部约定，用户无需关心
5. **vue → uni-render 转换**：在 compiler 中进行，不影响 UniApp 注入的代码

## 与 uni-render 的关系

本插件是 `uni-render` 的配套工具：

| 包名 | 职责 | 说明 |
|-----|------|------|
| `uni-render` | 运行时库 | 提供 `defineRenderComponent`、`h`、`ref` 等 API |
| `vite-plugin-uni-render` | Vite 插件 | 自动转换 Vue 组件，内置编译器 |

**推荐使用**：
```json
{
  "dependencies": {
    "uni-render": "latest"
  },
  "devDependencies": {
    "vite-plugin-uni-render": "latest"
  }
}
```

## 许可证

MIT
