import { camelize, capitalize, stringifyStyle } from '@vue/shared'
import { nextTick } from 'vue'
import { runtimeCustomElements } from '../common'

declare global {
  namespace UniShared {
    export var UniElement: any
    export var UniTextNode: any
    export var UniNode: any
    export var createUniEvent: any
  }
}

const { UniElement, UniTextNode, UniNode, createUniEvent } = UniShared
const UniEventTarget = UniNode.prototype.__proto__.constructor

export function normalizeEventType(
  type: string,
  options?: AddEventListenerOptions
) {
  if (options) {
    if (options.capture) {
      type += 'Capture'
    }
    if (options.once) {
      type += 'Once'
    }
    if (options.passive) {
      type += 'Passive'
    }
  }
  return `on${capitalize(camelize(type))}`
}

export const patchUniApp = () => {
  const originAddEventListener = UniEventTarget.prototype.addEventListener

  UniEventTarget.prototype._stopPropagation = function (event: any) {
    let target = this
    while ((target = target.parentNode as any)) {
      const listeners = target.listeners[event.type]
      listeners?.forEach((item: any) => {
        item.stop = true
      })
    }
  }

  UniEventTarget.prototype.addEventListener = function (
    type: string,
    listener: Function,
    options: any
  ) {
    function patchedEventListener(this: any, event: any) {
      if (patchedEventListener.stop) {
        patchedEventListener.stop = false
        return
      }
      const originType = event.type
      event.type = type
      const result = listener.call(this, event)
      event.type = originType
      return result
    }

    patchedEventListener.originListener = listener
    patchedEventListener.stop = false

    return originAddEventListener.call(
      this,
      type,
      patchedEventListener,
      options
    )
  }

  UniEventTarget.prototype.removeEventListener = function (
    type: string,
    callback: any,
    options?: AddEventListenerOptions
  ) {
    type = normalizeEventType(type, options)

    const listeners = this.listeners[type]
    if (!listeners) {
      return
    }

    const index = listeners.indexOf(
      (item: any) => item === callback || item.originListener === callback
    )

    if (index > -1) {
      listeners.splice(index, 1)
    }
  }

  const originDispatchEvent = UniEventTarget.prototype.dispatchEvent
  UniEventTarget.prototype.dispatchEvent = function (event: any) {
    event = createUniEvent(event)
    if (event.changedTouches && !Array.isArray(event.changedTouches)) {
      event.changedTouches = Object.values(event.changedTouches)
    }
    if (event.touches && !Array.isArray(event.touches)) {
      event.touches = Object.values(event.touches)
    }
    const result = originDispatchEvent.call(this, event)
    if (event._stop) {
      this._stopPropagation(event)
    }
    return result
  }

  Object.defineProperty(UniTextNode.prototype, 'data', {
    configurable: true,
    get() {
      return this.textContent
    },
    set(value) {
      this.textContent = value + ''
    },
  })

  const patchStyle = (node: any) => {
    let isUpdating = false

    let style = new Proxy({} as any, {
      get(target, prop) {
        return target[prop]
      },
      set(target, prop, value) {
        target[prop] = value

        if (!isUpdating) {
          isUpdating = true
          nextTick(() => {
            isUpdating = false
            const cssText = stringifyStyle(target)
            if (node.pageNode && !node.pageNode.isUnmounted) {
              node.pageNode.onSetAttribute(node, 'style', cssText)
            }
          })
        }
        return true
      },
    })

    Object.defineProperty(node, 'style', {
      configurable: true,
      set(value) {
        style = value
      },
      get() {
        return style
      },
    })
  }

  const CustomElementKey = Symbol.for('CustomElement')
  function UniCustomElement(tag: string, container: any) {
    const tagName = tag.toLowerCase()
    const CustomElement = runtimeCustomElements.get(tagName)

    let node
    if (CustomElement) {
      node = new CustomElement(tag, container)
      node[CustomElementKey] = true
    } else {
      node = new UniElement(tag, container)
    }

    patchStyle(node)

    return node
  }

  UniShared.UniElement = UniCustomElement as any

  const methods = ['insertBefore', 'appendChild', 'removeChild']

  methods.forEach((method) => {
    const originMethod = UniNode.prototype[method]
    UniNode.prototype[method] = function (...args: any[]) {
      const [node] = args
      const result = originMethod.apply(this, args)
      const isCustomElement = node[CustomElementKey]

      if (isCustomElement) {
        nextTick(() => {
          switch (method) {
            case 'insertBefore':
            case 'appendChild':
              node.connectedCallback?.()
              break
            case 'removeChild':
              node.disconnectedCallback?.()
              break
          }
        })
      }
      return result
    }
  })
}

export { UniElement, UniEventTarget, UniNode, UniTextNode }
