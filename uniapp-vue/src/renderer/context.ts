import { inject, InjectionKey, Ref } from 'vue'
import type { VNode } from 'vue'

export interface VueRender {
  render: (vnode: VNode) => number
  update: (id: number, vnode: VNode) => number
  unmount: (id: number) => void
  $documentInstance: any
  $vm: any
}

export interface DocumentComponentInstance {
  vueRender: {
    render: (vnode: VNode) => void
  }
  rootElement: any
}

export const vueRenderContext: InjectionKey<Ref<VueRender | null>> = Symbol('vueRenderContext')

export function useVueRender() {
  const render = inject(vueRenderContext)
  if (!render) {
    throw new Error('useVueRender must be used within a VueRender provider')
  }
  return render
}
