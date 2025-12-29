import { hook, HookType } from '../event'
import { createEvent } from '../../dom/mp/events'
import { DispatchEvent } from '../types'

hook.on(HookType.beforeDispatchEvent, (data: DispatchEvent) => {
  const { event } = data
  if (event.type === 'tap') {
    event.type = 'click'
  } else if (event.type === 'focus') {
    event.type = 'focusin'
  } else if (event.type === 'blur') {
    event.type = 'focusout'
  }
})

hook.on(HookType.dispatchEvent, (data: DispatchEvent) => {
  const { node, event } = data
  node.dispatchEvent(createEvent(event, node))
})
