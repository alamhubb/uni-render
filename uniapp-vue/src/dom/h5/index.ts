// H5 环境直接使用浏览器原生 document
// 不需要模拟 DOM，浏览器本身就支持
export const h5Document = typeof document !== 'undefined' ? document : null
