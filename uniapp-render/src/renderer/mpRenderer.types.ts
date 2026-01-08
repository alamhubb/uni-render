/**
 * h 函数相关类型定义
 */

import type { MPNode } from './serialize'

export type HProps = Record<string, any> | null
export type HChild = MPNode | string | number | null | undefined
export type HChildren = HChild | HChild[]
