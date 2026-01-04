# Custom Renderer 自定义渲染器

将 Vue 组件渲染到 MPNode 虚拟树，而非 DOM，用于小程序环境。

## 整体架构

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
│  3. 转译 WXSS → CSS                                              │
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

## 执行流程

### 1. 应用启动

```typescript
import { createApp } from 'vue'
// ↓ alias 重定向
import { createApp } from 'uniapp-render/compat'
// ↓ 实际调用
Custom Renderer 的 createApp
```

### 2. createApp(RootComponent)

1. 创建 `rootNode` (MPNode 虚拟根节点)
2. 注册 `updateScheduler` (用于自动触发 setData)

### 3. app.mount()

1. 调用 `h(RootComponent)` 创建 VNode
2. 调用 `render(vnode, rootNode)`
3. Vue diff 算法调用 nodeOps

### 4. nodeOps 执行

```typescript
createElement('view')  → MPNode { type: 'view', children: [] }
insert(child, parent)  → parent.children.push(child)
setText(node, text)    → node.text = text
remove(child)          → 从 parent.children 移除
```

每个修改操作后自动调用 `scheduleUpdate()`。

### 5. scheduleUpdate() 批量更新

```typescript
function scheduleUpdate() {
    if (dirty) return
    dirty = true
    queueMicrotask(() => {
        triggerUpdate()
        dirty = false
    })
}
```

### 6. triggerUpdate()

```typescript
function triggerUpdate() {
    const page = window.__currentPage__
    if (rootNode && page) {
        page.setData({
            vnodeTree: serializeTree(rootNode)
        })
    }
}
```

### 7. WXML 模板消费

setData 触发 WXML 编译产物重新渲染，vnodeTree 数据驱动 DOM 更新。

## 响应式更新流程

```
用户交互 (点击按钮)
       ↓
Vue 响应式数据变化 (count.value++)
       ↓
Vue effect 触发重新执行 render
       ↓
Vue diff → 调用 nodeOps
       ↓
scheduleUpdate() → queueMicrotask
       ↓
triggerUpdate() → setData({ vnodeTree })
       ↓
WXML 组件更新 → DOM 渲染
```

## 文件结构

- `renderer.ts` - 核心渲染器，createApp 入口
- `nodeOps.ts` - 节点操作函数 (createElement, insert, remove...)
- `patchProp.ts` - 属性更新函数
- `serialize.ts` - MPNode 序列化为 JSON
