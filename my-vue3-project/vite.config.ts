import { defineConfig } from "vite";
// import { uniRender } from "vite-plugin-uni-render";
import { uniRender } from "../vite-plugin-uni-render/src/index";
import { createRequire } from "module";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const uni = require("@dcloudio/vite-plugin-uni").default;
const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig(async ({ mode }) => {
  // mp-h5 mode: run in browser (without vite-plugin-mp for now)
  // 默认 h5 模式
  return {
    plugins: [
      uniRender({ debug: true }), // 启用调试模式查看 CSS 处理情况
      uni()
    ],
    server: {
      host: '192.168.1.7',
      // 确保静态资源在开发模式下不被缓存
      headers: {
        'Cache-Control': 'no-store'
      }
    },
    // 优化静态资源处理
    assetsInclude: ['**/*.png', '**/*.jpg', '**/*.jpeg', '**/*.gif', '**/*.svg', '**/*.webp']
  };
});
