# uniapp-vue

为 UniApp 提供自定义 `h` 函数，实现一套代码同时兼容 H5 和小程序。

## 📦 版本信息

- **版本**: 5.0.0
- **更新时间**: 2026-01-05
- **核心特性**: 自定义 h 函数 + 跨平台事件

---

## 🎯 核心功能

自定义 `h` 函数在标准 Vue h 函数基础上：

1. **保留原始 `onClick`** - H5 环境使用 Vue 原生事件处理
2. **添加 `bindtap`** - 小程序环境使用事件 ID 映射
3. **全局 Map 存储** - 按组件 ID 分组管理事件处理器
4. **Invoker 模式** - 支持事件更新，减少创建/销毁

---

## 📝 使用方式

```typescript
// 只需要把 h 从 vue 改成从 uniapp-vue 导入
import { ref, defineComponent } from 'vue'
import { h } from 'uniapp-vue'

const Counter = defineComponent({
  setup() {
    const count = ref(0)
    
    const increment = () => {
      count.value++
    }
    
    // 使用标准 Vue h 函数写法
    return () => h('view', { class: 'counter' }, [
      h('text', {}, `计数: ${count.value}`),
      h('button', { onClick: increment }, '+1')
    ])
  }
})
```

**就这么简单！** 其他代码完全不变，一套代码两端运行。

---

## 🔧 工作原理

```
用户代码: h('button', { onClick: handler }, '点击')
                        ↓
                 自定义 h 函数处理
                        ↓
            ┌───────────────────────────┐
            │ processedProps = {        │
            │   onClick: handler,    ← H5 使用
            │   bindtap: 'e0'        ← 小程序使用
            │ }                         │
            └───────────────────────────┘
                        ↓
            eventHandlers['e0'] = Invoker(handler)
                        ↓
                返回标准 VNode
```

### 环境适配

| 环境 | 事件处理方式 |
|------|-------------|
| H5 | Vue 使用保留的 `onClick` 直接处理 |
| 小程序 | 框架使用 `bindtap` + `eventHandlers` 处理 |

---

## 📦 API

### `h(type, props?, children?)`

自定义 h 函数，用法与 Vue 的 h 函数完全相同。

**自动处理的事件**：
- `onClick` → `bindtap`
- `onTap` → `bindtap`
- `onInput` → `bindinput`
- `onChange` → `bindchange`
- `onFocus` → `bindfocus`
- `onBlur` → `bindblur`
- 等等...

### `getEventHandlers(componentId)`

获取指定组件的事件处理器。

### `cleanupEventHandlers(componentId)`

清理组件的事件处理器（组件卸载时调用）。

### `beginRender(componentId)`

开始渲染，重置事件计数器。

---

## 🗂️ 目录结构

```
uniapp-vue/
├── index.ts          # 入口，导出 h 函数和辅助函数
└── src/
    └── h.ts          # 核心：自定义 h 函数实现
```

---

## 📜 License

MIT
