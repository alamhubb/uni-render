/**
 * uniapp-vue
 * 
 * 为 uni-app 提供自定义 h 函数
 * 使用 getApp().globalData 存储事件处理器
 */

// 导出自定义 h 函数
export {
    h,
    getEventHandlers,
    cleanupEventHandlers
} from './src/h'

// UniApp 编译产物可能需要的辅助函数
export function t(value: any): string {
    return String(value ?? '')
}

export function o(handler: Function): Function {
    return handler
}

// 版本信息
const VERSION = '5.0.0'
console.log(`[uniapp-vue] v${VERSION} - getApp().globalData 模式`)
