# vite-plugin-uni-render

> Vite 插件 - 自动将 render 函数转换为 useVnodeTree + RenderNode 方案

## 功能

自动检测 Vue 组件中的 render 函数，并转换为 `uniapp-render` 的 `useVnodeTree` + `RenderNode` 方案。

**转换前**：
```vue
<script lang="ts">
import { h, ref, defineComponent } from 'vue'

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

**转换后**：
```vue
<template>
  <RenderNode :node="vnodeTree" />
</template>

<script lang="ts">
import { useVnodeTree, RenderNode } from 'uniapp-render'
import { h, ref, defineComponent } from 'vue'

export default defineComponent({
  setup() {
    const count = ref(0)

    return {
      vnodeTree: useVnodeTree(() => h('view', { class: 'counter' }, [
        h('text', {}, `计数: ${count.value}`),
        h('button', { onClick: () => count.value++ }, '+1')
      ])),
      RenderNode
    }
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
    uniRender({
      debug: true,  // 开启调试日志
      includeDirs: ['pages', 'components']  // 要处理的目录
    }),
    uni()
  ]
})
```

## 配置选项

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `debug` | `boolean` | `false` | 是否开启调试日志 |
| `includeDirs` | `string[]` | `['pages', 'components']` | 要处理的目录 |

## 工作原理

1. **检测**：在 Vite 转换阶段，检测 `.vue` 文件中的 `setup()` 函数是否返回箭头函数（render 函数模式）

2. **转换**：
   - 添加 `import { useVnodeTree, RenderNode } from 'uniapp-render'`
   - 将 `return () => h(...)` 转换为 `return { vnodeTree: useVnodeTree(() => h(...)), RenderNode }`

3. **注入 template**：如果组件没有 template 或 template 为空，自动添加 `<RenderNode :node="vnodeTree" />`

## 支持的模式

插件可以检测以下 render 函数模式：

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

// 模式 3：返回普通函数
setup() {
  return function() {
    return h('view', {}, 'Hello')
  }
}
```

## 注意事项

1. **已有 useVnodeTree**：如果代码中已经使用了 `useVnodeTree`，不会重复转换

2. **手动写 template**：如果你手动写了非空的 template，插件不会覆盖

3. **目录过滤**：只处理 `includeDirs` 配置的目录下的文件

## 与 uniapp-render 的关系

本插件是 `uniapp-render` 的配套插件：

- `uniapp-render`：核心运行时，提供 `useVnodeTree` 和 `RenderNode`
- `vite-plugin-uni-render`：Vite 插件，自动转换 render 函数

两者配合使用，让你可以直接写 render 函数，无需手动调用 `useVnodeTree`。
