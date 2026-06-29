import { Switch as BaseSwitch } from '@base-ui/react/switch'
import { forwardRef } from 'react'
import type { ReactNode } from 'react'
import type { SwitchRoot } from '@base-ui/react/switch'

import { cx } from './control-utils'
import styles from './switch.module.css'

export type SwitchProps = Omit<SwitchRoot.Props, 'children' | 'className'> & {
  label?: ReactNode
  className?: string
  switchClassName?: string
  labelClassName?: string
}

export const Switch = forwardRef<HTMLElement, SwitchProps>(function Switch(
  { className, label, labelClassName, switchClassName, ...switchProps },
  ref,
) {
  const control = (
    <BaseSwitch.Root {...switchProps} className={cx(styles.switch, switchClassName)} ref={ref}>
      <BaseSwitch.Thumb className={styles.switchThumb} />
    </BaseSwitch.Root>
  )

  if (!label) {
    return control
  }

  return (
    <label className={cx(styles.switchRow, className)}>
      {control}
      <span className={cx(styles.controlLabel, labelClassName)}>{label}</span>
    </label>
  )
})
