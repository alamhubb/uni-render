# uni-app-render

> 让 uni-app 支持 Vue 渲染函数 (h 函数) 开发

## 特性

- 🚀 **零额外依赖** - 完全复用 uni-app 已有的 Vue 3 运行时
- 📦 **超小体积** - 仅增加 ~30KB 的 DOM 模拟层
- 🔧 **Vite 插件** - 一行配置即可使用
- 💪 **完整 Vue 3 支持** - ref、reactive、computed、watch 全部可用
- 🌍 **跨平台** - 支持微信/支付宝/H5/APP

## 安装

```bash
npm install uni-app-render
# 或
pnpm add uni-app-render
```

## 配置

在 `vite.config.ts` 中添加插件：

```typescript
import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'
import { uniAppRender } from 'uni-app-render/plugin'

export default defineConfig({
  plugins: [
    uniAppRender(),  // 添加这一行
    uni(),
  ],
})
```

在 `pages.json` 中添加全局组件（小程序端需要）：

```json
{
  "globalStyle": {
    "usingComponents": {
      "document": "/document"
    }
  }
}
```

## 使用

### 基本用法

```vue
<template>
  <button @click="handleRender">渲染组件</button>
  <Render @mounted="handleMounted" />
</template>

<script setup lang="ts">
import { h, ref } from 'vue'
import { Render, View, Text, Button } from 'uni-app-render'
import type { VueRender } from 'uni-app-render'

const renderRef = ref<VueRender>()

const handleMounted = (render: VueRender) => {
  renderRef.value = render
}

const handleRender = () => {
  const count = ref(0)
  
  // 使用 Vue 的 h 函数创建组件
  const Counter = () => h(View, { class: 'counter' }, [
    h(Text, null, `计数: ${count.value}`),
    h(Button, { onClick: () => count.value++ }, '增加'),
    h(Button, { 
      onClick: () => renderRef.value?.unmount(id) 
    }, '关闭')
  ])
  
  const id = renderRef.value?.render(h(Counter))
}
</script>
```

### 使用 defineComponent

```vue
<script setup lang="ts">
import { h, ref, defineComponent } from 'vue'
import { Render, View, Text, Button } from 'uni-app-render'

const renderRef = ref()

// 使用 defineComponent 获得完整的类型支持
const TodoList = defineComponent({
  props: {
    items: {
      type: Array as () => string[],
      default: () => []
    }
  },
  setup(props) {
    return () => h(View, null, 
      props.items.map((item, index) => 
        h(Text, { key: index }, item)
      )
    )
  }
})

const handleRender = () => {
  renderRef.value?.render(
    h(TodoList, { items: ['学习 Vue', '学习 uni-app', '使用 uni-app-render'] })
  )
}
</script>
```

### 响应式数据

```vue
<script setup lang="ts">
import { h, ref, reactive, computed, watch } from 'vue'
import { Render, View, Text, Input } from 'uni-app-render'

const renderRef = ref()

const handleRender = () => {
  // 所有 Vue 3 响应式 API 都可以使用
  const state = reactive({
    name: '',
    count: 0
  })
  
  const doubleCount = computed(() => state.count * 2)
  
  watch(() => state.name, (newVal) => {
    console.log('name changed:', newVal)
  })
  
  const App = () => h(View, null, [
    h(Input, {
      value: state.name,
      onInput: (e) => { state.name = e.detail.value }
    }),
    h(Text, null, `Double: ${doubleCount.value}`),
    h(Button, { onClick: () => state.count++ }, '+1')
  ])
  
  renderRef.value?.render(h(App))
}
</script>
```

## API

### Render 组件

渲染入口组件。

```vue
<Render @mounted="handleMounted" />
```

#### Events

| 事件 | 说明 | 回调参数 |
|------|------|----------|
| mounted | 组件挂载完成 | `VueRender` 实例 |

### VueRender 实例

| 方法 | 说明 | 参数 | 返回值 |
|------|------|------|--------|
| render | 渲染 VNode | `vnode: VNode` | 组件 ID |
| update | 更新组件 | `id: number, vnode: VNode` | 组件 ID |
| unmount | 卸载组件 | `id: number` | void |

### 内置组件

```typescript
import {
  View,      // 视图容器
  Text,      // 文本
  Button,    // 按钮
  Image,     // 图片
  Input,     // 输入框
  Textarea,  // 多行输入
  ScrollView,// 滚动视图
  Swiper,    // 轮播
  // ... 更多组件
} from 'uni-app-render'
```

### 生命周期 Hooks

```typescript
import {
  useVueLoad,
  useVueShow,
  useVueHide,
  useVueReady,
  useVueUnload,
  useVuePullDownRefresh,
  useVueReachBottom,
} from 'uni-app-render'

// 在 setup 中使用
useVueLoad((options) => {
  console.log('页面加载', options)
})
```

## 与原生 uni-app 对比

| 特性 | uni-app 原生 | uni-app-render |
|------|-------------|----------------|
| 语法 | Vue 模板 | h() 渲染函数 |
| 动态组件 | 有限支持 | 完全支持 |
| 高阶组件 | 不支持 | 支持 |
| 性能 | 最优 | 略有开销 |
| 包体积 | 基准 | +~30KB |

## 适用场景

✅ **推荐使用**：
- 需要动态渲染组件的场景
- 封装高阶组件
- 复杂的条件渲染逻辑
- 从其他项目迁移代码

❌ **不推荐**：
- 简单的静态页面（直接用模板更好）
- 对性能极度敏感的场景

## 原理

基于 Vue 3 的 Custom Renderer API，创建自定义渲染器，将 DOM 操作映射到小程序的 setData：

```
Vue h() → VNode → Custom Renderer → 模拟 DOM → setData → 小程序视图
```

## License

MIT

## 致谢

- [uni-app](https://uniapp.dcloud.net.cn/) - 优秀的跨平台框架
- [uni-app-react](https://github.com/nap-liu/uni-app-react) - 本项目的灵感来源
- [Taro](https://github.com/NervJS/taro) - 运行时架构参考
