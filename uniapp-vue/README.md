# uniapp-vue

让 uni-app 小程序支持 Vue 渲染函数（h 函数）开发

## 使用方式

### 安装

```bash
npm install uniapp-vue
```

### 方式 1：使用 Vite 插件（推荐）

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import { uniappVue } from 'uniapp-vue/plugin'

export default defineConfig({
  plugins: [
    uniappVue()  // 自动配置 Vue alias
  ]
})
```

### 方式 2：手动配置 alias

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  resolve: {
    alias: {
      'vue': resolve(__dirname, 'node_modules/uniapp-vue/index.ts'),
    }
  }
})
```

### 在组件中使用

```typescript
import { h, defineComponent, ref, createApp } from 'vue'

// 使用渲染函数开发
export default defineComponent({
  setup() {
    const count = ref(0)
    
    return () => h('div', { class: 'counter' }, [
      h('span', {}, `计数: ${count.value}`),
      h('button', { onClick: () => count.value++ }, '增加')
    ])
  }
})
```

---

## 设计原理

### 背景

uni-app 使用魔改版的 Vue，无法直接使用 Vue 的渲染函数（h 函数）。`uniapp-vue` 作为适配层，让开发者可以正常使用 Vue 3 的所有 API。

### 核心机制

```
┌─────────────────────────────────────────────────────────┐
│                 uniapp-vue 适配层                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  import { h, createApp } from 'vue'                     │
│                    ↓ Vite alias                         │
│  import { h, createApp } from 'uniapp-vue'              │
│                    ↓                                    │
│  ┌─────────────────────────────────────────────────┐    │
│  │         uniapp-vue/index.ts                     │    │
│  │                                                 │    │
│  │  // 导出标准 Vue API                            │    │
│  │  export * from '@vue/runtime-dom'               │    │
│  │                                                 │    │
│  │  // 导出适配函数                                 │    │
│  │  export { t, o, onLaunch, onShow, ... }         │    │
│  │                                                 │    │
│  └─────────────────────────────────────────────────┘    │
│                    ↓                                    │
│           标准 Vue 3 渲染器                              │
│                    ↓                                    │
│              浏览器 DOM                                  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 两种渲染函数来源

uniapp-vue 统一处理两种渲染函数：

| 来源 | 示例 |
|------|------|
| 用户手写 | `h('div', { class: 'box' }, 'Hello')` |
| WXML 编译 | `$WxmlTag.view({class:'box'}, ['Hello'])` |

两者都被 Vue 标准渲染器处理，最终渲染到浏览器 DOM。

---

## API 参考

### Vue 标准 API

从 `@vue/runtime-dom` 全部导出：

```typescript
export * from '@vue/runtime-dom'

// 包括：h, createApp, ref, reactive, computed, watch, ...
```

### 适配函数

| 函数 | 说明 |
|------|------|
| `t(value)` | 文本插值处理，将值转为字符串 |
| `o(handler)` | 事件处理器包装 |
| `onLaunch(callback)` | 小程序 onLaunch 生命周期 |
| `onShow(callback)` | 小程序 onShow 生命周期 |
| `onHide(callback)` | 小程序 onHide 生命周期 |
| `logError(err, type)` | 错误日志函数 |
| `injectHook(type, hook, target)` | 钩子注入 |

---

## 目录结构

```
uniapp-vue/
├── index.ts              # 入口文件
├── package.json
└── README.md

../vite-plugin-uniappvue/
├── index.ts              # Vite 插件
└── README.md
```

## 与其他模块的关系

```
┌─────────────────────────────────────────────────────────┐
│                用户小程序项目                            │
│  vite.config.ts → plugins: [uniappVue()]                │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│              vite-plugin-uniappvue                       │
│  自动配置: alias['vue'] = 'uniapp-vue'                   │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                    uniapp-vue                            │
│  导出 @vue/runtime-dom + 适配函数                        │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                    @vue/runtime-dom                      │
│  Vue 3 标准渲染器                                        │
└─────────────────────────────────────────────────────────┘
```

## License

MIT
