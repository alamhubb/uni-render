# vite-plugin-uniappvue

> Vite 插件 - 为 uniapp-render Custom Renderer 提供支持

## 🎯 功能

**vite-plugin-uniappvue** 是 [uniapp-render](../uniapp-render) 的官方 Vite 插件，为 Custom Renderer 提供完整支持。

### 功能 1：设置 Vue Alias

自动将 `'vue'` 导入重定向到 `'uniapp-render'`，确保使用 Custom Renderer 而不是标准 DOM 渲染器。

```javascript
// 用户代码
import { ref, h } from 'vue'

// ↓ 自动重定向为
import { ref, h } from 'uniapp-render'
```

### 功能 2：处理空 WXML（支持 h() 函数）

自动检测空的 WXML 模板文件，并添加 `render.wxml` 引用，让 h() 函数（Custom Renderer）能够工作。

**处理前**：
```xml
<!-- pages/index/index.wxml - 使用 h() 函数的页面，WXML 是空的 -->
<view></view>
```

**处理后**：
```xml
<block>
  <import src="/templates/render.wxml"/>
  <template is="render" data="{{vnodeTree}}" />
</block>
```

**为什么需要？**

当使用 h() 函数编写页面时：
- WXML 模板可能是空的（因为不需要写模板）
- 但 Custom Renderer 需要 `render.wxml` 来渲染 vnodeTree
- 插件自动完成这个注入过程

## 📦 安装

```bash
npm install vite-plugin-uniappvue -D
npm install uniapp-render
```

## 🔧 使用方式

### 基础配置（推荐）

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import { uniappVue } from 'vite-plugin-uniappvue'

export default defineConfig({
  plugins: [
    uniappVue()  // 使用默认配置
  ]
})
```

### 自定义配置

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import { uniappVue } from 'vite-plugin-uniappvue'

export default defineConfig({
  plugins: [
    uniappVue({
      // 是否打印调试日志
      debug: false,
      
      // 小程序编译输出目录
      mpDist: 'dist/dev/mp-weixin'
    })
  ]
})
```

## ⚙️ 配置选项

### `debug`

- **类型**：`boolean`
- **默认值**：`false`
- **说明**：是否打印调试日志

```typescript
uniappVue({
  debug: true  // 开启后会输出详细信息
})
```

### `mpDist`

- **类型**：`string`
- **默认值**：`'dist/dev/mp-weixin'`
- **说明**：小程序编译输出目录

如果修改了 UniApp 的输出目录，需要同步修改：

```typescript
uniappVue({
  mpDist: 'dist/build/mp-weixin'
})
```

## 🎨 工作原理

### 1. Vue Alias 配置

在 Vite 的 `config` 钩子中设置：

```typescript
config.resolve.alias['vue'] = 'uniapp-render'
```

### 2. WXML 处理流程

在 Vite 的 `writeBundle` 钩子中执行：

```
1. 检查输出目录是否存在
   ↓
2. 扫描所有 WXML 文件 (pages/**/*.wxml)
   ↓
3. 检测空模板
   ↓
4. 注入 render.wxml 引用
   ↓
5. 输出处理日志
```

## 📋 使用场景

### 场景 1：开发调试（mp-h5）

```bash
npm run dev:mp-h5
```

**插件作用**：
- ✅ 设置 Vue alias
- ⏸️ WXML 处理（输出目录不存在，自动跳过）

### 场景 2：打包小程序（mp-weixin）

```bash
npm run build:mp-weixin
```

**插件作用**：
- ✅ 设置 Vue alias
- ✅ 处理空 WXML 文件

## 🔗 相关项目

- **[uniapp-render](../uniapp-render)** - Vue 3 Custom Renderer 运行时
- **[miniprogram-web](../../miniprogram-web)** - 浏览器开发预览工具

## 🌟 为什么需要这个插件？

### 问题 1：UniApp 的 Vue 是魔改版

UniApp 提供的 Vue 不是标准 Vue 3：
- ❌ 缺少新特性
- ❌ 类型定义不完整
- ❌ 生态工具不兼容

**解决方案**：通过 alias 重定向到标准 Vue 3 + Custom Renderer

### 问题 2：h() 函数需要 render.wxml

使用 h() 函数开发时：
- WXML 模板可能是空的
- Custom Renderer 需要 render.wxml 才能工作
- 手动添加很繁琐

**解决方案**：自动检测并注入

## 💡 与 vite-plugin-mp 的区别

| 插件 | 归属 | 职责 | 使用场景 |
|------|------|------|----------|
| **vite-plugin-uniappvue** | uniapp-render | Custom Renderer 支持 | 开发 + 生产 |
| **vite-plugin-mp** | miniprogram-web | 浏览器开发工具 | 仅开发 |

**vite-plugin-uniappvue**：
- ✅ Vue alias 配置
- ✅ WXML 注入（Custom Renderer 必需）

**vite-plugin-mp**：
- ✅ WXML → h() 编译
- ✅ 浏览器环境模拟
- ✅ wx API 模拟

## 🐛 常见问题

### Q: 我的 WXML 没有被处理？

**A:** 检查以下几点：

1. **输出目录是否正确**：
   ```typescript
   uniappVue({
     mpDist: 'dist/dev/mp-weixin'  // 与 UniApp 输出目录一致
   })
   ```

2. **是否真的构建了小程序**：插件只在 `writeBundle` 后运行，需要执行 `npm run build:mp-weixin`

3. **WXML 是否为空**：插件只处理空模板

4. **查看日志**：
   ```typescript
   uniappVue({ debug: true })
   ```

### Q: Vue alias 不生效？

**A:** 可能的原因：

1. **插件顺序**：确保 uniappVue 在其他 Vue 插件之前
2. **缓存问题**：删除 `node_modules/.vite` 重试
3. **其他 alias 冲突**：检查是否有其他配置覆盖了 `alias['vue']`

### Q: 开发时需要这个插件吗？

**A:** 需要！

- ✅ 开发时：Vue alias 必需（让 Vue 导入使用 Custom Renderer）
- ✅ 生产时：Vue alias + WXML 处理都需要

## 📝 开发

### 目录结构

```
vite-plugin-uniappvue/
├── index.ts          # 插件源码
├── package.json      # 包配置
└── README.md         # 本文档
```

### 本地开发

在 monorepo 环境下，mono 会自动使用源码：

```bash
# 修改代码后
# 无需 build，mono 自动解析到 src
```

## 📄 License

MIT
