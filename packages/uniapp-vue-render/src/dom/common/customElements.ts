interface MPCustomElementConstructor {
  new(...args: any[]): any
}

export class MPCustomElements {
  customElements: Map<string, MPCustomElementConstructor> = new Map()
  define(name: string, ctor: MPCustomElementConstructor) {
    this.customElements.set(name, ctor)
  }
  get(name: string) {
    return this.customElements.get(name)
  }
}

// 在浏览器环境中使用原生 customElements
// 在其他环境中使用 MPCustomElements polyfill
export const runtimeCustomElements: MPCustomElements =
  typeof window !== 'undefined' && window.customElements
    ? (window.customElements as any as MPCustomElements)
    : new MPCustomElements()
