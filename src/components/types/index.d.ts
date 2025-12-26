import { VNode } from 'vue'

// 基础事件类型
export interface BaseEvent {
  type: string
  timeStamp: number
  target: {
    id: string
    dataset: Record<string, any>
  }
  currentTarget: {
    id: string
    dataset: Record<string, any>
  }
}

export interface TouchEvent extends BaseEvent {
  touches: Array<{
    identifier: number
    pageX: number
    pageY: number
    clientX: number
    clientY: number
  }>
  changedTouches: Array<{
    identifier: number
    pageX: number
    pageY: number
    clientX: number
    clientY: number
  }>
}

// 通用属性
export interface CommonProps {
  id?: string
  class?: string
  style?: string | Record<string, string | number>
  onClick?: (event: TouchEvent) => void
  onTouchstart?: (event: TouchEvent) => void
  onTouchmove?: (event: TouchEvent) => void
  onTouchend?: (event: TouchEvent) => void
  onTouchcancel?: (event: TouchEvent) => void
  onLongtap?: (event: TouchEvent) => void
}

// View 组件
export interface ViewProps extends CommonProps {
  hoverClass?: string
  hoverStartTime?: number
  hoverStayTime?: number
  hoverStopPropagation?: boolean
}

// Text 组件
export interface TextProps extends CommonProps {
  selectable?: boolean
  space?: 'ensp' | 'emsp' | 'nbsp'
  decode?: boolean
}

// Button 组件
export interface ButtonProps extends CommonProps {
  size?: 'default' | 'mini'
  type?: 'primary' | 'default' | 'warn'
  plain?: boolean
  disabled?: boolean
  loading?: boolean
  formType?: 'submit' | 'reset'
  openType?: string
}

// Image 组件
export interface ImageProps extends CommonProps {
  src: string
  mode?: 'scaleToFill' | 'aspectFit' | 'aspectFill' | 'widthFix' | 'heightFix' | 'top' | 'bottom' | 'center' | 'left' | 'right'
  lazyLoad?: boolean
  onLoad?: (event: BaseEvent & { detail: { width: number; height: number } }) => void
  onError?: (event: BaseEvent) => void
}

// Input 组件
export interface InputProps extends CommonProps {
  value?: string
  type?: 'text' | 'number' | 'idcard' | 'digit' | 'nickname'
  password?: boolean
  placeholder?: string
  placeholderStyle?: string
  placeholderClass?: string
  disabled?: boolean
  maxlength?: number
  cursorSpacing?: number
  focus?: boolean
  confirmType?: 'send' | 'search' | 'next' | 'go' | 'done'
  confirmHold?: boolean
  cursor?: number
  selectionStart?: number
  selectionEnd?: number
  onInput?: (event: BaseEvent & { detail: { value: string } }) => void
  onFocus?: (event: BaseEvent & { detail: { value: string; height: number } }) => void
  onBlur?: (event: BaseEvent & { detail: { value: string } }) => void
  onConfirm?: (event: BaseEvent & { detail: { value: string } }) => void
}

// ScrollView 组件
export interface ScrollViewProps extends CommonProps {
  scrollX?: boolean
  scrollY?: boolean
  upperThreshold?: number
  lowerThreshold?: number
  scrollTop?: number
  scrollLeft?: number
  scrollIntoView?: string
  scrollWithAnimation?: boolean
  enableBackToTop?: boolean
  onScrolltoupper?: (event: BaseEvent) => void
  onScrolltolower?: (event: BaseEvent) => void
  onScroll?: (event: BaseEvent & { detail: { scrollLeft: number; scrollTop: number; scrollHeight: number; scrollWidth: number; deltaX: number; deltaY: number } }) => void
}

// Swiper 组件
export interface SwiperProps extends CommonProps {
  indicatorDots?: boolean
  indicatorColor?: string
  indicatorActiveColor?: string
  autoplay?: boolean
  current?: number
  interval?: number
  duration?: number
  circular?: boolean
  vertical?: boolean
  previousMargin?: string
  nextMargin?: string
  displayMultipleItems?: number
  onChange?: (event: BaseEvent & { detail: { current: number; source: string } }) => void
  onAnimationfinish?: (event: BaseEvent & { detail: { current: number; source: string } }) => void
}

// 导出组件类型
export const View: string
export const Text: string
export const Button: string
export const Image: string
export const Input: string
export const ScrollView: string
export const Swiper: string
export const SwiperItem: string
export const Textarea: string
export const Checkbox: string
export const CheckboxGroup: string
export const Radio: string
export const RadioGroup: string
export const Picker: string
export const PickerView: string
export const PickerViewColumn: string
export const Slider: string
export const Switch: string
export const Form: string
export const Label: string
export const Navigator: string
export const Audio: string
export const Video: string
export const Camera: string
export const LivePlayer: string
export const LivePusher: string
export const Map: string
export const Canvas: string
export const WebView: string
export const Ad: string
export const Icon: string
export const Progress: string
export const RichText: string
export const MovableArea: string
export const MovableView: string
export const CoverImage: string
export const CoverView: string
