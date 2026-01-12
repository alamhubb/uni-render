import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'
import { uniRender } from 'vite-plugin-uni-render'

export default defineConfig({
    plugins: [
        uniRender(),  // ⚠️ 必须放在 uni() 之前
        uni()
    ]
})
