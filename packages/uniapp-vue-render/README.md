# uniapp-vue-render

**为 uni-app 小程序提供 Vue 3 渲染函数（h 函数）支持**

## 🎯 核心定位

uniapp-vue-render 是一个**渲染层包**，提供：
- 重新导出 uniapp-vue-adapter 的所有内容
- 自定义渲染器（基于 `@vue/runtime-core`）
- MPDocument（模拟 DOM）
- createApp 和 createSSRApp

## 📦 包结构

```
uniapp-vue-render/src/
├── index.ts             # 主入口
├── renderer/            # 自定义渲染器
├── dom/                 # MPDocument 实现
├── hook/                # 钩子系统
├── components/          # Render 组件
├── lifecycle/           # 生命周期
└── mp/                  # 小程序特定功能
```

## 🔧 使用

### 安装

```bash
npm install uniapp-vue-render
```

### 导入

```typescript
import { 
  // 从 uniapp-vue-adapter 重新导出
  ref, 
  computed, 
  h,
  
  // 自定义渲染器
  createApp,
  createSSRApp,
  
  // 组件
  Render,
  View,
  Text,
  Button
} from 'uniapp-vue-render'
```

### 基本用法

```typescript
import { h, ref } from 'uniapp-vue-render'
import { Render } from 'uniapp-vue-render'

const Counter = () => {
  const count = ref(0)
  
  return () => h('view', { class: 'counter' }, [
    h('text', null, `Count: ${count.value}`),
    h('button', { onClick: () => count.value++ }, 'Increment')
  ])
}

// 使用 Render 组件渲染
<Render @mounted="handleMounted" />
```

## 🏗️ 依赖关系

```
uniapp-vue-render
  ├─ 依赖 uniapp-vue-adapter
  ├─ 重新导出 adapter 的所有内容
  └─ 提供自定义渲染器
```

## 🔄 工作原理

### 自定义渲染器

```typescript
import { createRenderer } from '@vue/runtime-core'

const renderer = createRenderer({
  createElement(tag) {
    // 渲染到 MPDocument
    return mpDocument.createElement(tag)
  },
  
  insert(child, parent) {
    parent.appendChild(child)
  },
  
  patchProp(el, key, value) {
    el.setAttribute(key, value)
  },
  
  // ... 其他操作
})

export const { createApp, render } = renderer
```

### createSSRApp

```typescript
import { createApp } from './renderer'

// createSSRApp 指向自定义渲染器的 createApp
export const createSSRApp = createApp
```

## 📚 相关包

- **uniapp-vue-adapter**：本包依赖的基础适配层
- **miniapp-runtime**：可以选择使用本包（如果需要 h 函数支持）

## 🤝 贡献

欢迎贡献代码！

## 📄 许可证

MIT
