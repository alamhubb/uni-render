import { defineConfig } from "vite";
import { uniRender } from "../vite-plugin-uniapp-render/index.ts";
import vitePluginMp from "../../miniprogram-web/vite-plugin-mp/src/index.ts";
import { createRequire } from "module";
import { resolve } from "path";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const uni = require("@dcloudio/vite-plugin-uni").default;
const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig(async ({ mode }) => {
  // mp-h5 mode: run miniapp in browser
  if (mode === 'mp-h5') {
    return {
      plugins: [
        // 核心平台插件 - 运行原生小程序
        ...vitePluginMp({
          mpDist: 'dist/dev/mp-weixin',
          autoCompile: true,
          compileCommand: 'mono ./node_modules/@dcloudio/vite-plugin-uni/bin/uni.js -p mp-weixin'
        })
      ],
      build: {
        outDir: 'build'  // 让 Vite 不把 dist 当作输出目录
      },
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
          'uniapp-render',
          'uniapp-render-compiler'
        ]
      }
    };
  }
  // mp-h5 mode: run in browser (without vite-plugin-mp for now)
  // 默认 h5 模式
  return {
    plugins: [
      uniRender({ debug: true }),  // 暂时禁用插件，测试手动写法
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
        'uniapp-render',
        'uniapp-render-compiler'
      ]
    }
  };
});
