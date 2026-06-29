import { Button as BaseButton } from '@base-ui/react/button'
import { forwardRef } from 'react'
import type { ReactNode } from 'react'

import { cx, toShortcutKeys } from './control-utils'
import type { ShortcutValue } from './control-utils'
import styles from './button.module.css'

type ButtonVariant = 'control' | 'ghost' | 'quiet' | 'outline'
type IconButtonSize = 'control' | 'compact'

type BaseButtonProps = React.ComponentPropsWithoutRef<typeof BaseButton>

export type ButtonProps = Omit<BaseButtonProps, 'className'> & {
  className?: string
  variant?: ButtonVariant
  fullWidth?: boolean
  leading?: ReactNode
  trailing?: ReactNode
  shortcut?: ShortcutValue
}

export type IconButtonProps = Omit<ButtonProps, 'children' | 'fullWidth' | 'leading' | 'shortcut' | 'trailing'> & {
  icon: ReactNode
  size?: IconButtonSize
  'aria-label': string
}

export type ShortcutTextProps = {
  keys: readonly ReactNode[]
  className?: string
}

export const Button = forwardRef<HTMLElement, ButtonProps>(function Button(
  {
    children,
    className,
    fullWidth,
    leading,
    shortcut,
    trailing,
    type = 'button',
    variant = 'control',
    ...buttonProps
  },
  ref,
) {
  return (
    <BaseButton
      {...buttonProps}
      className={cx(styles.button, className)}
      data-full-width={fullWidth ? '' : undefined}
      data-variant={variant}
      ref={ref}
      type={type}
    >
      {leading ? <span className={styles.buttonIcon}>{leading}</span> : null}
      <span className={styles.buttonLabel}>{children}</span>
      {shortcut ? <ShortcutText keys={toShortcutKeys(shortcut)} className={styles.buttonShortcut} /> : null}
      {trailing ? <span className={styles.buttonTrailing}>{trailing}</span> : null}
    </BaseButton>
  )
})

export const IconButton = forwardRef<HTMLElement, IconButtonProps>(function IconButton(
  { className, icon, size = 'control', type = 'button', variant = 'ghost', ...buttonProps },
  ref,
) {
  return (
    <BaseButton
      {...buttonProps}
      className={cx(styles.button, styles.iconButton, className)}
      data-size={size}
      data-variant={variant}
      ref={ref}
      type={type}
    >
      <span className={styles.iconButtonIcon}>{icon}</span>
    </BaseButton>
  )
})

export function ShortcutText({ className, keys }: ShortcutTextProps) {
  return (
    <span className={cx(styles.shortcut, className)} aria-hidden="true">
      {keys.map((key, index) => (
        <span className={styles.shortcutKey} key={index}>
          {key}
        </span>
      ))}
    </span>
  )
}
