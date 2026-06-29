import type { SVGAttributes } from 'react'

import { cx } from './control-utils'
import styles from './checkmark.module.css'

export type CheckmarkProps = SVGAttributes<SVGSVGElement> & {
  indeterminate?: boolean
}

export function Checkmark({ className, indeterminate, ...svgProps }: CheckmarkProps) {
  return (
    <svg {...svgProps} className={cx(styles.checkmark, className)} viewBox="0 0 10 10" aria-hidden="true">
      <path
        className={styles.checkmarkPath}
        d={indeterminate ? 'M2 5H8' : 'M1.75 5.75 4.516 8.25 8.75 1.75'}
      />
    </svg>
  )
}
