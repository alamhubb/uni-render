# uniapp-render

让 UniApp 支持 Vue 渲染函数 (h 函数) 开发

## ✨ 特性

- 🚀 **零配置** - 安装插件即可使用渲染函数
- 🔄 **自动转换** - 自动识别并转换渲染函数组件
- 📦 **兼容性强** - 支持现有 Vue 3 渲染函数代码
- 🎯 **零侵入** - 无需修改业务代码

## 📦 安装

```bash
npm install uniapp-render vite-plugin-uniapp-render
```

## 🔧 配置

在 `vite.config.ts` 中添加插件：

```typescript
import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'
import { uniRender } from 'vite-plugin-uniapp-render'

export default defineConfig({
    plugins: [
        uniRender(),  // ⚠️ 必须放在 uni() 之前
        uni()
    ]
})
```

## 📝 使用示例

创建渲染函数组件（无需 `<template>`）：

```vue
<script setup lang="ts">
import { ref, h, defineComponent } from 'vue'

export default defineComponent({
    setup() {
        const count = ref(0)
        
        return () => h('view', { class: 'container' }, [
            h('text', {}, `计数: ${count.value}`),
            h('button', { onClick: () => count.value++ }, '+1')
        ])
    }
})
</script>
```

插件会自动：
1. 检测到这是渲染函数组件（无 template）
2. 将 `from 'vue'` 转换为 `from 'uniapp-render'`
3. 添加 `<render-component :node="node" />` 模板

## 📄 License

MIT
