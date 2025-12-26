// 小程序端需要从 @vue/runtime-core 导入 createRenderer
// 因为 @dcloudio/uni-mp-vue 没有导出它
// 但 createRenderer 操作的是虚拟 DOM，不依赖平台
import {
  createRenderer,
  RootRenderFunction,
  CreateAppFunction,
  App,
  VNode,
  RendererOptions,
} from '@vue/runtime-core'
import { isOn, isString, extend } from '@vue/shared'
import { runtimeDocument } from '../dom'

// 节点操作接口
export interface RendererNode {
  [key: string]: any
}

export interface RendererElement extends RendererNode {}

// 处理事件名称
function normalizeEventName(name: string): string {
  return name.slice(2).toLowerCase()
}

// 处理属性设置
function patchProp(
  el: RendererElement,
  key: string,
  prevValue: any,
  nextValue: any
) {
  if (isOn(key)) {
    const eventName = normalizeEventName(key)
    if (prevValue) {
      el.removeEventListener(eventName, prevValue)
    }
    if (nextValue) {
      el.addEventListener(eventName, nextValue)
    }
  } else if (key === 'style') {
    if (isString(nextValue)) {
      el.style.cssText = nextValue
    } else if (nextValue) {
      for (const styleKey in nextValue) {
        el.style[styleKey] = nextValue[styleKey]
      }
      if (prevValue) {
        for (const styleKey in prevValue) {
          if (!(styleKey in nextValue)) {
            el.style[styleKey] = ''
          }
        }
      }
    }
  } else if (key === 'class') {
    el.className = nextValue || ''
  } else if (key === 'innerHTML' || key === 'textContent') {
    el[key] = nextValue == null ? '' : nextValue
  } else {
    if (nextValue == null || nextValue === false) {
      el.removeAttribute(key)
    } else {
      el.setAttribute(key, nextValue === true ? '' : String(nextValue))
    }
  }
}

// 创建渲染器选项
const nodeOps: Omit<RendererOptions<RendererNode, RendererElement>, 'patchProp'> = {
  insert: (child, parent, anchor) => {
    if (anchor) {
      parent.insertBefore(child, anchor)
    } else {
      parent.appendChild(child)
    }
  },

  remove: (child) => {
    const parent = child.parentNode
    if (parent) {
      parent.removeChild(child)
    }
  },

  createElement: (tag) => {
    return runtimeDocument.createElement(tag)
  },

  createText: (text) => {
    return runtimeDocument.createTextNode(text)
  },

  createComment: (text) => {
    return runtimeDocument.createComment(text)
  },

  setText: (node, text) => {
    node.nodeValue = text
  },

  setElementText: (el, text) => {
    el.textContent = text
  },

  parentNode: (node) => {
    return node.parentNode
  },

  nextSibling: (node) => {
    return node.nextSibling
  },

  querySelector: (selector) => {
    return null
  },
}

// 创建自定义渲染器
const { render: baseRender, createApp: baseCreateApp } = createRenderer(
  extend({ patchProp }, nodeOps)
)

// 导出渲染函数
export const render = baseRender as RootRenderFunction<RendererElement>

// 创建应用实例
export const createApp = ((rootComponent: any, rootProps?: any) => {
  const app = baseCreateApp(rootComponent, rootProps)

  const { mount } = app
  app.mount = (container: RendererElement | string) => {
    let rootContainer: RendererElement

    if (isString(container)) {
      console.warn('String selector is not supported in mini-program environment')
      return
    } else {
      rootContainer = container
    }

    return mount(rootContainer, false)
  }

  return app
}) as CreateAppFunction<RendererElement>

// 导出类型
export type { VNode, App }
