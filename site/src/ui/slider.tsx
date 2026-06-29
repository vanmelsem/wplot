import { Slider as BaseSlider } from '@base-ui/react/slider'
import type { SliderRoot } from '@base-ui/react/slider'

import { cx } from './control-utils'
import styles from './slider.module.css'

type SliderThumbProps = React.ComponentPropsWithoutRef<typeof BaseSlider.Thumb>

export type SliderProps<Value extends number | readonly number[] = number> = Omit<
  SliderRoot.Props<Value>,
  'children' | 'className'
> & {
  className?: string
  controlClassName?: string
  trackClassName?: string
  indicatorClassName?: string
  thumbClassName?: string
  thumbCount?: number
  thumbProps?: Omit<SliderThumbProps, 'className' | 'index'>
  fullWidth?: boolean
}

export function Slider<Value extends number | readonly number[] = number>({
  className,
  controlClassName,
  fullWidth,
  indicatorClassName,
  thumbClassName,
  thumbCount,
  thumbAlignment = 'edge',
  thumbProps,
  trackClassName,
  ...rootProps
}: SliderProps<Value>) {
  const resolvedThumbCount = thumbCount ?? getSliderThumbCount(rootProps.value, rootProps.defaultValue)

  return (
    <BaseSlider.Root
      {...rootProps}
      className={cx(styles.sliderRoot, className)}
      data-full-width={fullWidth ? '' : undefined}
      thumbAlignment={thumbAlignment}
    >
      <BaseSlider.Control className={cx(styles.sliderControl, controlClassName)}>
        <BaseSlider.Track className={cx(styles.sliderTrack, trackClassName)}>
          <BaseSlider.Indicator className={cx(styles.sliderIndicator, indicatorClassName)} />
        </BaseSlider.Track>
        {Array.from({ length: resolvedThumbCount }, (_, index) => (
          <BaseSlider.Thumb
            {...thumbProps}
            className={cx(styles.sliderThumb, thumbClassName)}
            index={index}
            key={index}
          />
        ))}
      </BaseSlider.Control>
    </BaseSlider.Root>
  )
}

function getSliderThumbCount(
  value: number | readonly number[] | undefined,
  defaultValue: number | readonly number[] | undefined,
) {
  const currentValue = value ?? defaultValue

  if (Array.isArray(currentValue)) {
    return Math.max(1, currentValue.length)
  }

  return 1
}
