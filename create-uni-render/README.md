# create-uni-render

[![npm version](https://img.shields.io/npm/v/create-uni-render.svg)](https://www.npmjs.com/package/create-uni-render)
[![license](https://img.shields.io/npm/l/create-uni-render.svg)](https://github.com/AlamHubb/uni-render/blob/main/LICENSE)

> 快速创建 UniApp + render 函数项目的脚手架

## 🚀 使用方式

```bash
# 方式一：使用 npx（推荐）
npx create-uni-render

# 方式二：指定项目名
npx create-uni-render my-project

# 方式三：全局安装后使用
npm install -g create-uni-render
create-uni-render my-project
```

## 📦 创建后的项目结构

```
my-uni-render-project/
├── src/
│   ├── pages/
│   │   └── index/
│   │       ├── index.vue           # Page 组件
│   │       └── components/
│   │           └── HelloWorld.vue  # 渲染函数组件示例
│   ├── App.vue
│   ├── main.ts
│   ├── pages.json
│   └── manifest.json
├── vite.config.ts                  # 已配置 uniRender 插件
├── package.json
└── tsconfig.json
```

## 🎯 下一步

```bash
# 进入项目目录
cd my-uni-render-project

# 安装依赖
npm install

# 启动 H5 开发
npm run dev:h5

# 启动微信小程序开发
npm run dev:mp-weixin
```

## ✨ 特性

- ✅ **开箱即用**：已配置 `uni-render` 和 `vite-plugin-uni-render`
- ✅ **TypeScript 支持**：默认使用 TypeScript
- ✅ **示例代码**：包含渲染函数组件示例
- ✅ **多平台支持**：支持 H5、微信小程序等平台

## 🔗 相关链接

- [uni-render 核心库](https://www.npmjs.com/package/uni-render)
- [vite-plugin-uni-render 插件](https://www.npmjs.com/package/vite-plugin-uni-render)
- [GitHub 仓库](https://github.com/AlamHubb/uni-render)

## 📄 License

MIT
