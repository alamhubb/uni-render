# uniapp-render

为微信小程序提供 Vue 3 渲染函数（h 函数）支持。

## 🎯 核心架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        用户 .vue 源码                            │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                    UniApp 编译器                                 │
│        编译 .vue → .wxml + .wxss + .js (小程序格式)              │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                    vite-plugin-mp                                │
│  1. 配置 alias: vue → uniapp-render/compat                         │
│  2. 转译 WXML → Vue render 函数                                  │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                    浏览器运行时                                   │
│                                                                  │
│  uniapp-render/compat (替换 vue)                                   │
│    → createApp/createSSRApp → Custom Renderer                   │
│                              │                                   │
│                              ▼                                   │
│  Custom Renderer (createRenderer)                               │
│    → nodeOps 操作 MPNode 虚拟树                                  │
│                              │                                   │
│                              ▼                                   │
│  triggerUpdate → setData({ vnodeTree })                         │
│                              │                                   │
│                              ▼                                   │
│  WXML 编译产物消费 vnodeTree → DOM 渲染                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📚 Vue 标准 vs 我们的扩展

### Vue 标准（Custom Renderer 必须实现）

| 概念 | 说明 |
|------|------|
| `createRenderer(options)` | 创建渲染器的 API |
| `createElement(type)` | 创建元素 |
| `createText(text)` | 创建文本节点 |
| `insert(child, parent, anchor)` | 插入节点 |
| `remove(child)` | 移除节点 |
| `setText(node, text)` | 设置文本内容 |
| `patchProp(el, key, prev, next)` | 更新属性 |
| `parentNode / nextSibling` | 节点遍历 |

### 我们的扩展（为小程序定制）

| 概念 | 说明 |
|------|------|
| **MPNode** | 虚拟节点数据结构 `{ id, type, props, children }` |
| **serializeTree()** | 序列化 MPNode 树为 JSON |
| **scheduleUpdate()** | 批量更新调度器，避免频繁 setData |
| **triggerUpdate()** | 调用 setData 发送数据到小程序 |
| **compat.ts** | Vue 兼容层，替换 createApp |
| **Vite alias** | `vue → uniapp-render/compat` 无侵入式劫持 |

```
┌─────────────────────────────────────────────────┐
│              Vue 标准 (必须实现)                 │
│  createRenderer({ nodeOps, patchProp })         │
│           ↓                                     │
│  { render, createApp }                          │
│           ↓ Vue 自动调用 nodeOps                │
│  createElement / insert / remove / ...          │
└─────────────────────────────────────────────────┘
                       │
                       ▼ 这里开始是我们的扩展
┌─────────────────────────────────────────────────┐
│              我们的扩展 (自己实现)               │
│  MPNode 数据结构                                │
│  scheduleUpdate() → 批量更新                    │
│  triggerUpdate() → setData()                    │
│  serializeTree() → JSON                         │
│  compat.ts → 替换 createApp                     │
└─────────────────────────────────────────────────┘
```

**简单说：Vue 只负责 diff 算法和调用 nodeOps，怎么把数据发给小程序是我们自己的事。**

---

## 安装

```bash
npm install uniapp-render
```

## 使用

### 方式一：自动集成（推荐）

通过 Vite alias 自动替换 `vue`，用户代码无需修改：

```typescript
// vite.config.ts
export default {
  resolve: {
    alias: {
      'vue': 'uniapp-render/compat'
    }
  }
}
```

然后正常使用 Vue：

```typescript
import { createApp, h, ref } from 'vue'  // 自动使用 Custom Renderer
```

### 方式二：手动使用

```typescript
import { h, ref, defineComponent } from 'vue'
import { createMpApp, createPageHandlers } from 'uniapp-render'

const App = defineComponent({
  setup() {
    const count = ref(0)
    return () => h('view', {}, [
      h('text', {}, `计数: ${count.value}`),
      h('button', { onClick: () => count.value++ }, '增加')
    ])
  }
})

// 页面 JS
Page({
  data: { vnodeTree: null },
  ...createPageHandlers(),
  onLoad() {
    createMpApp(App).mount()
  }
})
```

## 目录结构

```
uniapp-render/
├── index.ts           # 入口
├── src/
│   ├── compat.ts      # Vue 兼容层
│   ├── renderer/      # Custom Renderer
│   │   ├── renderer.ts
│   │   ├── nodeOps.ts
│   │   ├── patchProp.ts
│   │   └── serialize.ts
│   ├── events.ts      # 事件系统
│   └── bridge.ts      # 事件处理器
└── templates/
    └── render.wxml    # WXML 递归模板
```

## License

MIT

