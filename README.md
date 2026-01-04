# uniapp-render

> 让 UniApp 支持 Vue 渲染函数（h 函数）开发，实现**动态结构 + 动态数据**的小程序渲染方案

## 🎯 核心定位

**解决的问题**：UniApp 原生只支持 template 模板，无法使用 h() 渲染函数动态创建视图结构。

**我们的方案**：通过 `RenderNode` 组件，将 h() 渲染函数的输出自动转换为可被 UniApp 渲染的数据结构。

## 🚀 使用方式

### 方式1：传入 render 函数（推荐）

```vue
<template>
  <RenderNode :render="renderContent" />
</template>

<script setup>
import { h, ref } from 'vue'
import { RenderNode } from 'uniapp-render'

const count = ref(0)

// render 函数
const renderContent = () => h('view', { class: 'counter' }, [
  h('text', {}, `计数: ${count.value}`),
  h('button', { onClick: () => count.value++ }, '+1')
])
</script>
```

**特点**：
- ✅ 不需要 `useVnodeTree` 包裹
- ✅ 使用标准 Vue `h` 函数
- ✅ 响应式自动处理
- ✅ 更接近 Vue 原生开发体验

### 方式2：传入 MPNode 数据（高级用法）

```vue
<template>
  <RenderNode :node="vnodeTree" />
</template>

<script setup>
import { h, ref } from 'vue'
import { useVnodeTree, RenderNode } from 'uniapp-render'

const count = ref(0)

const { vnodeTree } = useVnodeTree(() => 
  h('view', {}, `计数: ${count.value}`)
)
</script>
```

## 📐 工作原理

```
h('view', { class: 'box' }, 'Hello')
    ↓
RenderNode 接收 render 函数
    ↓
watchEffect 追踪响应式依赖
    ↓
VNode → MPNode 转换
    ↓
递归渲染为 UniApp 组件
    ↓
数据变化 → 自动更新
```

## 📦 支持的元素

RenderNode 目前支持以下元素类型：
- `view` - 容器
- `text` - 文本
- `button` - 按钮
- `input` - 输入框
- `image` - 图片

## 🎨 事件处理

```vue
<script setup>
const renderContent = () => h('view', {}, [
  // 支持 onClick, onTap, onInput 等
  h('button', { onClick: () => console.log('clicked') }, '点击'),
  h('input', { onInput: (e) => console.log(e.detail.value) })
])
</script>
```

事件自动转换：
| Vue 事件 | 小程序事件 |
|---------|-----------|
| `onClick` | `bindtap` |
| `onTap` | `bindtap` |
| `onInput` | `bindinput` |
| `onChange` | `bindchange` |

## 📁 API

### `RenderNode` 组件

```typescript
// Props
interface RenderNodeProps {
  // 方式1：传入 render 函数（推荐）
  render?: () => VNode
  
  // 方式2：传入 MPNode 数据
  node?: MPNode
}
```

### `MPNode` 类型

```typescript
interface MPNode {
  id: number
  type: string
  props: Record<string, any>
  text?: string
  children: MPNode[]
}
```

### 工具函数（可选）

```typescript
import { 
  useVnodeTree,           // 手动转换 VNode → MPNode
  vnodeToMPNode,          // 纯函数转换
  getEventHandlers,       // 获取事件处理器
  cleanupEventHandlers    // 清理事件
} from 'uniapp-render'
```

## 🔗 与 UniApp 的关系

**uniapp-render 与 UniApp 可以混合使用**：

```vue
<template>
  <view>
    <!-- UniApp 正常 template 内容 -->
    <text>普通内容</text>
    
    <!-- h() 函数动态渲染区域 -->
    <RenderNode :render="dynamicContent" />
  </view>
</template>
```

## 📄 License

MIT
