import type { CSSProperties, ReactNode } from 'react'

export type ShortcutValue = ReactNode | readonly ReactNode[]

export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

export function toShortcutKeys(shortcut: ShortcutValue) {
  return Array.isArray(shortcut) ? shortcut : [shortcut]
}

export function toCssSize(value: CSSProperties['width']) {
  return typeof value === 'number' ? `${value}px` : value
}
