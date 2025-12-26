import {
  onAddToFavorites,
  onBackPress,
  onError,
  onExit,
  onInit,
  onLaunch,
  onLoad,
  onNavigationBarButtonTap,
  onNavigationBarSearchInputChanged,
  onNavigationBarSearchInputClicked,
  onNavigationBarSearchInputConfirmed,
  onNavigationBarSearchInputFocusChanged,
  onPageHide,
  onPageNotFound,
  onPageScroll,
  onPageShow,
  onPullDownRefresh,
  onReachBottom,
  onReady,
  onResize,
  onSaveExitState,
  onShareAppMessage,
  onShareTimeline,
  onTabItemTap,
  onThemeChange,
  onUnhandledRejection,
  onUnload,
  onHide,
  onShow,
} from '@dcloudio/uni-app'
import { ref, onUnmounted } from 'vue'

const lifeCycleMap: Record<string, any> = {
  onBackPress,
  onError,
  onExit,
  onInit,
  onLaunch,
  onLoad,
  onNavigationBarButtonTap,
  onNavigationBarSearchInputChanged,
  onNavigationBarSearchInputClicked,
  onNavigationBarSearchInputConfirmed,
  onNavigationBarSearchInputFocusChanged,
  onPageHide,
  onPageNotFound,
  onPageShow,
  onPullDownRefresh,
  onReachBottom,
  onReady,
  onResize,
  onSaveExitState,
  onTabItemTap,
  onThemeChange,
  onUnhandledRejection,
  onUnload,
  onHide,
  onShow,
}

type LifeCycleType = keyof typeof lifeCycleMap

type Callback = (...args: any[]) => any

const lifecycleHookMap: Map<
  string,
  Map<LifeCycleType, Array<(...args: any[]) => any>>
> = new Map()

const getPageId = () => {
  const pages = getCurrentPages()
  const idx = pages.length - 1
  const page = pages[idx]
  return `${idx}-${page.route}`
}

export const useDispatchLifeCycle = (
  extraLifeCycle?: Record<string, Callback>
) => {
  const id = getPageId()
  const lifeCycle = {
    ...lifeCycleMap,
    ...(extraLifeCycle || ({} as any)),
  }

  const keys = Object.keys(lifeCycle) as Array<LifeCycleType>
  keys.forEach((key) => {
    const fn = lifeCycle[key]
    if (typeof fn === 'function') {
      // @ts-ignore
      fn((...args) => {
        return dispatchLifeCycle(id, key, args)
      })
    }
  })

  onUnmounted(() => {
    lifecycleHookMap.delete(id)
  })
}

export const createLifeCycle =
  (type: LifeCycleType) =>
  (...payload: any[]) => {
    return dispatchLifeCycle(getPageId(), type, payload)
  }

export const dispatchLifeCycle = (
  id: string,
  type: LifeCycleType,
  payload: any[]
) => {
  const isAsync = [
    'onInit',
    'onLoad',
    'onShow',
    'onReady',
    'onPageShow',
  ].includes(type)
  if (isAsync) {
    setTimeout(() => {
      const hooks = lifecycleHookMap.get(id)?.get(type)
      hooks?.forEach((hook) => hook(...payload))
    })
  } else {
    const hooks = lifecycleHookMap.get(id)?.get(type)
    return hooks?.reduce((_, hook) => hook(...payload), null)
  }
}

const attachLifeCycle = (
  type: LifeCycleType,
  callback: (...args: any[]) => any
) => {
  const id = getPageId()

  let pageHook = lifecycleHookMap.get(id)

  if (!pageHook) {
    pageHook = new Map()
  }
  lifecycleHookMap.set(id, pageHook)

  let hooks = pageHook.get(type)
  if (!hooks) {
    hooks = []
  }
  pageHook.set(type, hooks)

  hooks.push(callback)

  return () => {
    const index = hooks.indexOf(callback)
    if (index !== -1) {
      hooks.splice(index, 1)
    }
  }
}

type Dispose = (() => void) | null

// Vue 风格的生命周期 hooks
export const useVueLoad: typeof onLoad = (callback: Callback) => {
  const dispose = ref<Dispose>(null)
  if (!dispose.value) {
    dispose.value = attachLifeCycle('onLoad', callback)
  }
}

export const useVueShow: typeof onShow = (callback: Callback) => {
  const dispose = ref<Dispose>(null)
  if (!dispose.value) {
    dispose.value = attachLifeCycle('onShow', callback)
  }
}

export const useVueHide: typeof onHide = (callback: Callback) => {
  const dispose = ref<Dispose>(null)
  if (!dispose.value) {
    dispose.value = attachLifeCycle('onHide', callback)
  }
}

export const useVueReady: typeof onReady = (callback: Callback) => {
  const dispose = ref<Dispose>(null)
  if (!dispose.value) {
    dispose.value = attachLifeCycle('onReady', callback)
  }
}

export const useVueUnload: typeof onUnload = (callback: Callback) => {
  const dispose = ref<Dispose>(null)
  if (!dispose.value) {
    dispose.value = attachLifeCycle('onUnload', callback)
  }
}

export const useVuePullDownRefresh: typeof onPullDownRefresh = (callback: Callback) => {
  const dispose = ref<Dispose>(null)
  if (!dispose.value) {
    dispose.value = attachLifeCycle('onPullDownRefresh', callback)
  }
}

export const useVueReachBottom: typeof onReachBottom = (callback: Callback) => {
  const dispose = ref<Dispose>(null)
  if (!dispose.value) {
    dispose.value = attachLifeCycle('onReachBottom', callback)
  }
}

export const useVuePageScroll: typeof onPageScroll = (callback: Callback) => {
  const dispose = ref<Dispose>(null)
  if (!dispose.value) {
    dispose.value = attachLifeCycle('onPageScroll', callback)
  }
}

export const useVueShareAppMessage: typeof onShareAppMessage = (callback: Callback) => {
  const dispose = ref<Dispose>(null)
  if (!dispose.value) {
    dispose.value = attachLifeCycle('onShareAppMessage', callback)
  }
}

export const useVueShareTimeline: typeof onShareTimeline = (callback: Callback) => {
  const dispose = ref<Dispose>(null)
  if (!dispose.value) {
    dispose.value = attachLifeCycle('onShareTimeline', callback)
  }
}

export const useVueBackPress: typeof onBackPress = (callback: Callback) => {
  const dispose = ref<Dispose>(null)
  if (!dispose.value) {
    dispose.value = attachLifeCycle('onBackPress', callback)
  }
}

export const useVueTabItemTap: typeof onTabItemTap = (callback: Callback) => {
  const dispose = ref<Dispose>(null)
  if (!dispose.value) {
    dispose.value = attachLifeCycle('onTabItemTap', callback)
  }
}
