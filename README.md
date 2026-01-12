# uni-render

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

## 项目结构

```
uni-render/
├── uni-render/           # 核心运行时库
│   ├── src/
│   │   ├── index.ts         # 导出所有 API
│   │   ├── renderer/        # 自定义渲染器
│   │   │   ├── customRenderer.ts    # 基于 @vue/runtime-core 的渲染器
│   │   │   ├── defineRenderComponent.ts  # Page 组件包装器
│   │   │   └── render.ts    # 渲染入口
│   │   ├── components/      # 运行时组件
│   │   │   └── RenderComponent.vue  # 递归渲染 RenderNode
│   │   └── event/           # 事件系统
│
├── uni-render-compiler/  # 编译时转换器
│   └── src/
│       └── index.ts         # SFC 转换逻辑
│
├── vite-plugin-uni-render/  # Vite 插件
│   └── index.ts             # 文件处理入口
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
npm install uni-render uni-render-compiler vite-plugin-uni-render
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

**Page 组件（.vue）**
```vue
<script lang="ts">
import { h, ref, defineComponent } from 'vue'
import HelloWorld from './components/HelloWorld'

export default defineComponent({
  setup() {
    return () => h('view', {}, [
      h(HelloWorld, { msg: 'Hello' })
    ])
  }
})
</script>
```

**Component 组件（.ts）**
```typescript
import { h, ref, defineComponent } from 'vue'

export default defineComponent({
  props: {
    msg: { type: String, required: true }
  },
  setup(props) {
    const count = ref(0)
    return () => h('view', {}, [
      h('text', {}, props.msg),
      h('button', { onClick: () => count.value++ }, `count: ${count.value}`)
    ])
  }
})
```

## 注意事项

1. **Component 样式**：非 Page 的 `.vue` 组件样式通过 CSS 虚拟模块处理，会自动注入到页面中。

2. **响应式系统**：确保 `ref`、`reactive` 等 API 从 `uni-render`（实际是 `@vue/runtime-core`）导入，这样响应式更新才能正确工作。

3. **事件处理**：使用 `onClick`、`onInput` 等 Vue 风格的事件名，会自动转换为 UniApp 的事件格式。

4. **node_modules**：node_modules 中的 `.vue` 文件也会被处理（通过虚拟模块），确保第三方 Vue 组件也能正常工作。

## 标签映射表

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

