import { MPCustomEvent } from '../dom/mp/events'
import { runtimeDocument } from '../dom'
import { render } from '../renderer'
import { eventHandler } from './common'

declare global {
  interface MiniProgramComponentBuiltins {
    setData(data: Record<string, any>): void
    triggerEvent(name: string, detail?: any): void
    [key: string]: any
  }

  type DataDef<D> = D extends () => infer R ? R : D

  type ComponentThis<D, M> = DataDef<D> & M & MiniProgramComponentBuiltins

  type ComponentOptions<D, M> = {
    data?: D | (() => D)
    methods?: M
    options?: Record<string, any>
    [key: string]: any
  } & ThisType<ComponentThis<D, M>>

  function Component<D, M>(options: ComponentOptions<D, M>): void
}

let attached
let detached
let data = 'data'
// #ifdef MP-ALIPAY
attached = 'didMount'
detached = 'didUnmount'
// #endif
// #ifdef MP-WEIXIN
attached = 'attached'
detached = 'detached'
// #endif

export default Component({
  options: {
    multipleSlots: true,
    virtualHost: true,
  },
  // #ifdef MP-ALIPAY
  props: {
    onMounted: Function,
  },
  // #endif
  [data]: {
    root: null,
  },
  [attached]: function () {
    this.createRoot()
  },
  [detached]: function () {
    this.destroy()
  },

  methods: {
    createRoot() {
      const rootElement = runtimeDocument.createElement('root')
      runtimeDocument.body.appendChild(rootElement)
      this.rootElement = rootElement
      rootElement.addEventListener('update:patch', this.update.bind(this))

      const vueRender = {
        render(vnode: any) {
          return render(vnode, rootElement)
        },
      }

      this.vueRender = vueRender
      // #ifdef MP-WEIXIN
      this.triggerEvent('mounted', this)
      // #endif
      // #ifdef MP-ALIPAY
      this.props.onMounted(new MPCustomEvent('mounted', { detail: this }))
      // #endif
    },
    eh: eventHandler,
    update(event: any) {
      this.setData(event.detail)
    },
    destroy() {
      this.vueRender.render(null)
      runtimeDocument.body.removeChild(this.rootElement)
      this.vueRender = null
      this.rootElement = null
    },
  },
})
