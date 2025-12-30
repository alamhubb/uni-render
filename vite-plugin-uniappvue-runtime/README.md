# vite-plugin-uniappvue

Vite 插件 - 让 uni-app 支持 Vue 渲染函数开发

## 使用方式

### 安装

```bash
npm install uniapp-vue
```

### 配置

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import { uniappVue } from 'uniapp-vue/plugin'

export default defineConfig({
  plugins: [
    uniappVue()
  ]
})
```

### 选项

```typescript
uniappVue({
  debug: true  // 是否打印调试日志（默认 false）
})
```

### 在组件中使用

配置完成后，可以直接使用 Vue 渲染函数：

```typescript
import { h, defineComponent, ref } from 'vue'

export default defineComponent({
  setup() {
    const count = ref(0)
    
    return () => h('div', { class: 'container' }, [
      h('span', {}, `计数: ${count.value}`),
      h('button', { onClick: () => count.value++ }, '增加')
    ])
  }
})
```

---

## 设计原理

### 问题

uni-app 使用魔改版的 Vue，导致用户无法直接使用 Vue 的渲染函数（h 函数）开发。

### 解决方案

通过 Vite 的 alias 机制，将所有 `import from 'vue'` 重定向到 `uniapp-vue`：

```
用户代码: import { h } from 'vue'
            ↓ Vite alias 拦截
uniapp-vue: 导出 @vue/runtime-dom + 适配函数
            ↓
标准 Vue 渲染器
```

### 工作流程

```
┌─────────────────────────────────────────────────────────┐
│                    Vite 构建流程                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. 插件 config 钩子                                     │
│     ┌─────────────────────────────────────────────────┐ │
│     │ config.resolve.alias['vue'] = 'uniapp-vue'      │ │
│     └─────────────────────────────────────────────────┘ │
│                           ↓                             │
│  2. 代码中的 Vue 导入                                    │
│     ┌─────────────────────────────────────────────────┐ │
│     │ import { h, createApp } from 'vue'              │ │
│     │              ↓ 被重定向到                        │ │
│     │ import { h, createApp } from 'uniapp-vue'       │ │
│     └─────────────────────────────────────────────────┘ │
│                           ↓                             │
│  3. uniapp-vue 导出标准 Vue API                         │
│     ┌─────────────────────────────────────────────────┐ │
│     │ export * from '@vue/runtime-dom'                │ │
│     │ export { t, o, onLaunch, onShow, ... }          │ │
│     └─────────────────────────────────────────────────┘ │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 核心代码

```typescript
export function uniappVue(): Plugin {
  return {
    name: 'vite:uniapp-vue',
    enforce: 'pre',

    config(config) {
      // 将 'vue' alias 指向 uniapp-vue
      config.resolve.alias['vue'] = 'path/to/uniapp-vue/index.ts'
      return config
    }
  }
}
```

### 优势

1. **零侵入** - 不修改任何用户代码
2. **统一渲染** - 用户代码和 WXML 编译产物使用同一个 Vue
3. **标准 API** - 完全支持 Vue 3 的所有 API
4. **简单配置** - 一行代码完成配置

## License

MIT
