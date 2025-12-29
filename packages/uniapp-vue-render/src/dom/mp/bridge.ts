/**
 * MPDocumentBridge - 渲染桥接器
 * 
 * 将 MPDocument 虚拟 DOM 的变化同步到浏览器真实 DOM
 * 这样可以在浏览器中测试真正的小程序虚拟 DOM 行为
 */

import { MPDocument } from './document'
import { MPHTMLElement } from './element'
import { MPNode, MPText } from './node'
import { ELEMENT_NODE, TEXT_NODE } from './consts'

/**
 * MPDocument 到真实 DOM 的桥接器
 */
export class MPDocumentBridge {
    private mpDocument: MPDocument
    private realContainer: HTMLElement
    private nodeMap: WeakMap<MPNode, Node> = new WeakMap()
    private observer: MutationObserver | null = null

    constructor(mpDocument: MPDocument, realContainer: HTMLElement) {
        this.mpDocument = mpDocument
        this.realContainer = realContainer

        console.log('[MPDocumentBridge] Initialized')
    }

    /**
     * 开始监听 MPDocument body 的变化并同步到真实 DOM
     */
    start() {
        // 初始渲染
        this.syncToRealDOM()

        // 设置定时器定期同步（简单方案，后续可改为更精细的观察者模式）
        this.startPolling()

        console.log('[MPDocumentBridge] Started syncing')
    }

    /**
     * 轮询同步（简单实现）
     */
    private pollTimer: any = null
    private lastRenderHash: string = ''

    private startPolling() {
        this.pollTimer = setInterval(() => {
            const currentHash = this.getTreeHash(this.mpDocument.body)
            if (currentHash !== this.lastRenderHash) {
                this.syncToRealDOM()
                this.lastRenderHash = currentHash
            }
        }, 16) // ~60fps
    }

    /**
     * 获取树的简单哈希（用于检测变化）
     */
    private getTreeHash(node: MPNode): string {
        let hash = `${node.nodeType}:${node.nodeName}`

        if (node instanceof MPText) {
            hash += `:${node.data}`
        }

        if (node instanceof MPHTMLElement) {
            // 包含属性
            node.attributes.forEach((value, key) => {
                hash += `:${key}=${value}`
            })
            // 包含样式
            if (node.style) {
                hash += `:style=${node.style.cssText}`
            }
        }

        // 递归子节点
        for (const child of node.childNodes) {
            hash += `[${this.getTreeHash(child)}]`
        }

        return hash
    }

    /**
     * 将 MPDocument body 同步到真实 DOM
     */
    syncToRealDOM() {
        // 清空容器
        this.realContainer.innerHTML = ''
        this.nodeMap = new WeakMap()

        // 渲染 body 的子节点
        for (const child of this.mpDocument.body.childNodes) {
            const realNode = this.createRealNode(child)
            if (realNode) {
                this.realContainer.appendChild(realNode)
            }
        }
    }

    /**
     * 将 MPNode 转换为真实 DOM 节点
     */
    private createRealNode(mpNode: MPNode): Node | null {
        if (mpNode.nodeType === TEXT_NODE) {
            const mpText = mpNode as MPText
            const textNode = document.createTextNode(mpText.data || '')
            this.nodeMap.set(mpNode, textNode)
            return textNode
        }

        if (mpNode.nodeType === ELEMENT_NODE) {
            const mpElement = mpNode as MPHTMLElement

            // 创建真实元素
            const tagName = mpElement.nodeName.toLowerCase()
            const realElement = document.createElement(tagName)
            this.nodeMap.set(mpNode, realElement)

            // 复制属性
            mpElement.attributes.forEach((value, key) => {
                if (key === 'class') {
                    realElement.className = value
                } else if (key === 'style') {
                    realElement.style.cssText = value
                } else {
                    realElement.setAttribute(key, value)
                }
            })

            // 复制内联样式
            if (mpElement.style && mpElement.style.cssText) {
                realElement.style.cssText = mpElement.style.cssText
            }

            // 复制事件监听器
            this.copyEventListeners(mpElement, realElement)

            // 递归创建子节点
            for (const child of mpNode.childNodes) {
                const realChild = this.createRealNode(child)
                if (realChild) {
                    realElement.appendChild(realChild)
                }
            }

            return realElement
        }

        return null
    }

    /**
     * 复制事件监听器
     */
    private copyEventListeners(mpElement: MPHTMLElement, realElement: HTMLElement) {
        // MPEventTarget 中存储的事件
        const eventTarget = mpElement as any
        if (eventTarget._listeners) {
            for (const [eventName, listeners] of Object.entries(eventTarget._listeners)) {
                if (Array.isArray(listeners)) {
                    for (const listener of listeners) {
                        realElement.addEventListener(eventName, listener as EventListener)
                    }
                }
            }
        }
    }

    /**
     * 停止同步
     */
    stop() {
        if (this.pollTimer) {
            clearInterval(this.pollTimer)
            this.pollTimer = null
        }
        console.log('[MPDocumentBridge] Stopped syncing')
    }
}

/**
 * 全局桥接器实例
 */
let globalBridge: MPDocumentBridge | null = null

/**
 * 初始化 MPDocument 桥接（在浏览器环境中使用）
 */
export function initMPDocumentBridge(mpDocument: MPDocument, containerId: string = 'app'): MPDocumentBridge {
    const container = document.getElementById(containerId)
    if (!container) {
        throw new Error(`[MPDocumentBridge] Container #${containerId} not found`)
    }

    globalBridge = new MPDocumentBridge(mpDocument, container)
    globalBridge.start()

    return globalBridge
}

/**
 * 获取全局桥接器
 */
export function getGlobalBridge(): MPDocumentBridge | null {
    return globalBridge
}
