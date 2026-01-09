# vite-plugin-uni-render

> Vite 插件 - 自动将无模板的渲染函数 Vue 组件转换为小程序可用的格式

## 功能

自动检测没有模板的 Vue 渲染函数组件，并转换为 `uniapp-render` 的 `defineRenderComponent` + `render-component` 方案。

**用户写（标准 Vue 代码）**：
```vue
<script lang="ts">
import { defineComponent, ref, h } from 'vue'

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

**自动转换为**：
```vue
<template>
  <render-component :node="node" />
</template>

<script lang="ts">
import { defineRenderComponent, ref, h } from 'uniapp-render'

export default defineRenderComponent({
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

## 安装

```bash
npm install vite-plugin-uni-render
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
    uniRender({
      debug: true,  // 开启调试日志
      includeDirs: ['pages', 'components']  // 要处理的目录
    }),
    uni()
  ]
})
```

**⚠️ 重要**：`uniRender()` 必须放在 `uni()` 之前，确保在 UniApp 处理之前完成转换。

## 配置选项

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `debug` | `boolean` | `false` | 是否开启调试日志 |
| `includeDirs` | `string[]` | `['pages', 'components']` | 要处理的目录 |

## 工作原理

1. **检测**：在 Vite 转换阶段，检测 `.vue` 文件是否：
   - 没有 `<template>` 或 template 为空
   - `setup()` 返回函数（渲染函数模式）

2. **转换**：
   - `from 'vue'` → `from 'uniapp-render'`
   - `defineComponent` → `defineRenderComponent`

3. **注入 template**：自动添加 `<render-component :node="node" />`

## 支持的模式

插件可以检测以下渲染函数模式：

```typescript
// 模式 1：直接返回箭头函数
setup() {
  return () => h('view', {}, 'Hello')
}

// 模式 2：箭头函数带花括号
setup() {
  return () => {
    return h('view', {}, 'Hello')
  }
}
```

## 注意事项

1. **已有 defineRenderComponent**：如果代码中已经使用了 `defineRenderComponent`，不会重复转换

2. **有模板的组件**：如果你写了非空的 template，插件不会处理

3. **目录过滤**：只处理 `includeDirs` 配置的目录下的文件

4. **插件顺序**：必须放在 `uni()` 之前

## 与 uniapp-render 的关系

本插件是 `uniapp-render` 的配套插件：

- `uniapp-render`：核心运行时，提供 `defineRenderComponent`、`render`、`render-component`
- `vite-plugin-uni-render`：Vite 插件，自动转换渲染函数组件

两者配合使用，让你可以用**标准 Vue 写法**开发小程序，无需手动处理桥接代码。
