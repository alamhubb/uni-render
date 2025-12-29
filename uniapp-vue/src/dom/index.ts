// customElements registry
export * from './common'

// 导入 MPDocument 相关
import { MPDocument } from './mp/document'
import { MPDocumentBridge, initMPDocumentBridge } from './mp/bridge'

// ============================================
// 运行时 Document 配置
// ============================================

// 创建全局 MPDocument 实例（虚拟 DOM）
// 这是 Vue createRenderer 操作的目标
export const mpDocument = new MPDocument()

// runtimeDocument 现在指向 MPDocument
// Vue 的渲染器将操作这个虚拟 DOM
export const runtimeDocument: any = mpDocument

// 桥接器实例
let _bridge: MPDocumentBridge | null = null

/**
 * 在浏览器环境中初始化桥接
 * 将 MPDocument 虚拟 DOM 同步到真实 DOM
 */
export function initBrowserBridge(containerId: string = 'app'): MPDocumentBridge | null {
    // 只在浏览器环境中初始化
    if (typeof document === 'undefined') {
        console.log('[MPDocument] 非浏览器环境，跳过桥接初始化')
        return null
    }

    if (_bridge) {
        console.log('[MPDocument] 桥接器已存在')
        return _bridge
    }

    // 等待 DOM 加载完成
    const tryInit = () => {
        const container = document.getElementById(containerId)
        if (container) {
            _bridge = initMPDocumentBridge(mpDocument, containerId)
            console.log(`[MPDocument] 桥接器已初始化，目标容器: #${containerId}`)
            return _bridge
        }
        return null
    }

    // 尝试立即初始化
    const bridge = tryInit()
    if (bridge) return bridge

    // 如果 DOM 未就绪，延迟初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            tryInit()
        })
    } else {
        // DOM 已加载但容器不存在，可能需要等待
        console.warn(`[MPDocument] 容器 #${containerId} 不存在，请稍后手动调用 initBrowserBridge`)
    }

    return null
}

/**
 * 获取桥接器实例
 */
export function getBridge(): MPDocumentBridge | null {
    return _bridge
}

// 导出 MPDocument 相关类型
export { MPDocument } from './mp/document'
export { MPDocumentBridge } from './mp/bridge'

// 兼容旧 API
export function setRuntimeDocument(doc: any) {
    console.warn('[MPDocument] setRuntimeDocument 已废弃，runtimeDocument 现在固定为 MPDocument')
}

export function getRuntimeDocument(): any {
    return runtimeDocument
}
