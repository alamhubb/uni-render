# uniapp-vue

为微信小程序提供 Vue 3 渲染函数（h 函数）支持。

## 🎯 核心架构

> **重点**：理解这张图就理解了整个项目的工作原理

```
┌────────────────────────────────────┐
│            用户代码                  │
│  h('view', { class: 'x' }, [...])  │
└────────────────┬───────────────────┘
                 ↓
┌────────────────────────────────────┐
│   Custom Renderer (uniapp-vue)     │
│   Vue createRenderer 创建          │
└────────────────┬───────────────────┘
                 ↓
┌────────────────────────────────────┐
│       MPNode 虚拟节点树              │
│  { type: 'view', props: {...} }    │
└────────────────┬───────────────────┘
                 ↓
┌────────────────────────────────────┐
│         serialize 序列化            │
└────────────────┬───────────────────┘
                 ↓
┌────────────────────────────────────┐
│    setData({ vnodeTree: {...} })   │
└────────────────┬───────────────────┘
                 ↓
┌────────────────────────────────────┐
│   WXML 递归模板 (render.wxml)       │
│   根据 vnodeTree 数据递归渲染        │
└────────────────┬───────────────────┘
                 ↓
        ┌────────┴────────┐
        ↓                 ↓
┌───────────────┐   ┌───────────────┐
│  微信小程序     │   │   浏览器       │
│  原生渲染       │   │               │
│  (目标平台)     │   │ wxml-compiler │
└───────────────┘   │ WXML → h()    │
                    └───────┬───────┘
                            ↓
                    ┌───────────────┐
                    │ Vue runtime   │
                    │ h() → DOM     │
                    │ (开发预览)     │
                    └───────────────┘
```

### 关键点

1. **目标平台是微信小程序**，浏览器只是开发预览
2. **Custom Renderer 只有一个**，两端共用
3. **区别在最后一步**：
   - 微信小程序：WXML 模板原生渲染
   - 浏览器：wxml-compiler 将 WXML 转为 h()，Vue 渲染

---

## 安装

```bash
npm install uniapp-vue
```

## 使用

```typescript
import { h, ref, defineComponent } from 'vue'
import { createMpApp, createBridge, createPageHandlers } from 'uniapp-vue'

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
    createBridge(this)
    createMpApp(App).mount()
  }
})
```

## 目录结构

```
uniapp-vue/
├── index.ts           # 入口
├── src/
│   ├── renderer/      # Custom Renderer
│   │   ├── renderer.ts
│   │   ├── nodeOps.ts
│   │   ├── patchProp.ts
│   │   └── serialize.ts
│   ├── events.ts      # 事件系统
│   └── bridge.ts      # 桥接层
└── templates/
    └── render.wxml    # WXML 递归模板
```

## License

MIT
