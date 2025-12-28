# uniapp-vue-adapter

**Vue 3 适配层，为 uni-app 小程序提供官方 Vue 3 API**

## 🎯 核心定位

uniapp-vue-adapter 是一个**基础适配层**，提供：
- 官方 Vue 3 的所有 API
- uni-app 特有的适配函数（o, t, 生命周期钩子）

**注意**：不包含自定义渲染器，保持纯粹性。

## 📦 导出内容

### 1. 官方 Vue 3 API

```typescript
export {
  // 核心 API
  defineComponent,
  ref,
  computed,
  reactive,
  readonly,
  toRef,
  toRefs,
  isRef,
  unref,
  
  // 生命周期
  onMounted,
  onUnmounted,
  onBeforeMount,
  onBeforeUnmount,
  onUpdated,
  onBeforeUpdate,
  
  // Watch API
  watch,
  watchEffect,
  
  // 工具函数
  nextTick,
  getCurrentInstance,
  
  // 组件 API
  provide,
  inject,
  
  // 渲染函数
  h,
  createVNode,
  
  // 类型
  type Ref,
  type ComputedRef,
  type App,
  type VNode,
  type Component
} from 'vue'
```

### 2. uni-app 适配函数

```typescript
// 事件处理函数（替代 vOn）
export function o(handler: Function): Function

// 文本处理函数
export function t(value: any): string

// 小程序生命周期
export function onLaunch(callback?: Function): void
export function onShow(callback?: Function): void
export function onHide(callback?: Function): void
```

## 🔧 使用

### 安装

```bash
npm install uniapp-vue-adapter
```

### 导入

```typescript
import { ref, computed, o, t } from 'uniapp-vue-adapter'

// 使用官方 Vue API
const count = ref(0)
const double = computed(() => count.value * 2)

// 使用适配函数
const handler = o(() => console.log('clicked'))
const text = t('Hello')
```

## 🏗️ 设计原则

### 1. 从真实 Vue 导入

```typescript
export { ... } from 'vue'
```

**重要**：必须从 `'vue'` 导入，而不是 `'vue/dist/vue.esm-bundler.js'`，避免 Vite 解析错误。

### 2. 不包含渲染器

uniapp-vue-adapter 只提供 API 适配，不包含自定义渲染器。

如果需要自定义渲染器，请使用 `uniapp-vue-render`。

### 3. 保持纯粹性

只提供必要的适配功能，不添加额外的增强特性。

## 📚 相关包

- **uniapp-vue-render**：依赖本包，提供自定义渲染器
- **miniapp-runtime**：使用本包，提供小程序运行时

## 🤝 贡献

欢迎贡献代码！

## 📄 许可证

MIT
