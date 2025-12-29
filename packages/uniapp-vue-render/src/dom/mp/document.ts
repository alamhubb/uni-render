import { hook, HookType } from '../../hook'
import { runtimeCustomElements } from '../common/customElements'
import { controlledComponent, DOCUMENT_NODE, ID } from './consts'
import { MPHTMLElement } from './element'
import { MPFormElement } from './formElement'
import { MPNode, MPText } from './node'
import { MPRootElement } from './rootElement'

export class MPDocument extends MPNode {
  body: MPHTMLElement
  documentElement: MPHTMLElement
  allNode: Map<string, MPNode>
  // ID 索引，用于快速查找
  private idIndex: Map<string, MPHTMLElement> = new Map()

  constructor() {
    super(DOCUMENT_NODE, '#document')
    this.ownerDocument = null
    this.allNode = new Map()

    const html = this.createElement('html')
    const head = this.createElement('head')
    const title = this.createElement('title')
    const body = this.createElement('body')

    html.appendChild(head)
    head.appendChild(title)
    html.appendChild(body)
    this.appendChild(html)

    this.body = body
    this.documentElement = html
  }

  createElementNS(namespaceURI: string, tag: string) {
    return this.createElement(tag)
  }

  createElement(tag: string) {
    const nodeName = tag.toLowerCase()

    let el: MPHTMLElement | MPRootElement | MPFormElement
    switch (true) {
      case nodeName === 'root':
        el = new MPRootElement()
        break
      case controlledComponent.has(nodeName):
        el = new MPFormElement(nodeName)
        break
      default:
        const CustomElement = runtimeCustomElements.get(nodeName)
        if (CustomElement) {
          // @ts-ignore
          el = new CustomElement(nodeName)
        } else {
          el = new MPHTMLElement(tag)
        }
        break
    }
    el.ownerDocument = this
    hook.emit(HookType.createElement, { node: el, tag })
    return el
  }

  createTextNode(data: string) {
    const text = new MPText(data)
    text.ownerDocument = this
    return text
  }

  createComment(data: string) {
    // 小程序不支持注释节点，用空文本节点代替
    return this.createTextNode('')
  }

  getElementBySid(sid?: string) {
    if (!sid) {
      return null
    }
    return this.allNode.get(sid) || null
  }

  /**
   * 注册元素 ID（供 setAttribute 调用）
   */
  registerElementId(id: string, element: MPHTMLElement) {
    if (id) {
      this.idIndex.set(id, element)
    }
  }

  /**
   * 注销元素 ID
   */
  unregisterElementId(id: string) {
    if (id) {
      this.idIndex.delete(id)
    }
  }

  /**
   * 通过 ID 获取元素
   * Vue createRenderer 的 querySelector 需要这个
   */
  getElementById(id: string): MPHTMLElement | null {
    // 先从索引查找
    const cached = this.idIndex.get(id)
    if (cached) {
      return cached
    }
    // 如果索引没有，遍历查找
    return this.findElementById(this.body, id)
  }

  /**
   * 递归查找具有指定 ID 的元素
   */
  private findElementById(node: MPNode, id: string): MPHTMLElement | null {
    if (node instanceof MPHTMLElement && node.id === id) {
      return node
    }
    for (const child of node.childNodes) {
      const found = this.findElementById(child, id)
      if (found) {
        return found
      }
    }
    return null
  }

  /**
   * CSS 选择器查询（Vue createRenderer 需要）
   * 目前只支持 ID 选择器 (#id) 和标签选择器 (tag)
   */
  querySelector(selector: string): MPHTMLElement | null {
    if (!selector) {
      return null
    }

    // ID 选择器: #id
    if (selector.startsWith('#')) {
      const id = selector.slice(1)
      return this.getElementById(id)
    }

    // 标签选择器: tag
    if (/^[a-zA-Z][a-zA-Z0-9-]*$/.test(selector)) {
      return this.findElementByTagName(this.body, selector.toLowerCase())
    }

    // 暂不支持其他选择器
    console.warn(`[MPDocument] querySelector: 不支持的选择器 "${selector}"`)
    return null
  }

  /**
   * 递归查找具有指定标签名的元素
   */
  private findElementByTagName(node: MPNode, tagName: string): MPHTMLElement | null {
    if (node instanceof MPHTMLElement && node.nodeName.toLowerCase() === tagName) {
      return node
    }
    for (const child of node.childNodes) {
      const found = this.findElementByTagName(child, tagName)
      if (found) {
        return found
      }
    }
    return null
  }
}
