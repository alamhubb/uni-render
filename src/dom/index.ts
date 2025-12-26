// customElements registry
export * from './common'

// 默认使用浏览器原生 document（H5 环境）
let _runtimeDocument: any = typeof document !== 'undefined' ? document : null

// #ifdef MP
import { mpDocument } from './mp'
export * from './mp'
_runtimeDocument = mpDocument
// #endif

// #ifdef H5
import { h5Document } from './h5'
export * from './h5'
_runtimeDocument = h5Document
// #endif

// #ifdef APP
export * from './app'
import { appDocument } from './app'
_runtimeDocument = appDocument
// #endif

export const runtimeDocument = _runtimeDocument as Document
