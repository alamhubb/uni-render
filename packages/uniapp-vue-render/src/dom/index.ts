// customElements registry
export * from './common'

// 运行时检测环境，使用原生 document
// 在浏览器环境中，直接使用 window.document
// 在其他环境中（如小程序），需要提供 polyfill

export const runtimeDocument: Document =
    typeof document !== 'undefined' ? document : (null as any)

// 如果需要使用自定义 document（如 MPDocument），可以通过以下方式设置
let _customDocument: Document | null = null

export function setRuntimeDocument(doc: Document) {
    _customDocument = doc
}

export function getRuntimeDocument(): Document {
    return _customDocument || runtimeDocument
}
