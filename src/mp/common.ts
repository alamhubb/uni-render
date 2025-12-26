import { hook, HookType } from '../hook'
import { MPDocument } from '../dom/mp/document'
import { MpEvent } from '../dom/mp/events'
import { runtimeDocument } from '../dom'

export const eventHandler = (event: MpEvent) => {
  const currentTarget = event.currentTarget!
  const detail = event.detail
  const __args__ = detail?.__args__

  const dom = (runtimeDocument as any as MPDocument).getElementBySid(
    currentTarget.dataset?.sid
  )

  if (dom) {
    const mpEvent = Array.isArray(__args__) ? __args__[0] : event

    const payload = {
      node: dom,
      originEvent: event,
      event: mpEvent,
    }

    hook.emit(HookType.beforeDispatchEvent, payload)
    hook.emit(HookType.dispatchEvent, payload)
    hook.emit(HookType.afterDispatchEvent, payload)
  }
}
