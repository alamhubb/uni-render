import { defineConfig } from "vite";
import { uniRender } from "../vite-plugin-uniapp-render/index.ts";
import { createRequire } from "module";
import { resolve } from "path";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const uni = require("@dcloudio/vite-plugin-uni").default;
const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig(async ({ mode }) => {
  // mp-h5 mode: run in browser (without vite-plugin-mp for now)
  // 默认 h5 模式
  return {
    plugins: [
      uniRender(),
      uni()
    ],
    server: {
      host: '192.168.1.7'
    },
    resolve: {
      alias: [
        { find: 'uniapp-render-compiler', replacement: resolve(__dirname, '../uniapp-render-compiler/src/index.ts') }
      ]
    },
    optimizeDeps: {
      exclude: [
        'uniapp-render-compiler'
      ]
    }
  };
});
