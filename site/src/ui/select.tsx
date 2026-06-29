import { Select as BaseSelect } from '@base-ui/react/select'
import type { CSSProperties, ReactNode } from 'react'
import type { SelectRoot } from '@base-ui/react/select'

import { Checkmark } from './checkmark'
import { cx, toCssSize } from './control-utils'
import styles from './select.module.css'

type SelectPrimitiveValue = string | number
type SelectPositionerProps = React.ComponentPropsWithoutRef<typeof BaseSelect.Positioner>

export type SelectItemConfig<Value extends SelectPrimitiveValue = string> = {
  value: Value
  label: ReactNode
  disabled?: boolean
}

export type SelectSeparatorConfig = {
  type: 'separator'
  id?: string
}

export type SelectEntry<Value extends SelectPrimitiveValue = string> =
  | SelectItemConfig<Value>
  | SelectSeparatorConfig

export type SelectProps<Value extends SelectPrimitiveValue = string> = Omit<
  SelectRoot.Props<Value, false>,
  'children' | 'items' | 'multiple' | 'onValueChange'
> & {
  items: readonly SelectEntry<Value>[]
  onValueChange?: (value: Value | null, eventDetails: SelectRoot.ChangeEventDetails) => void
  placeholder?: ReactNode
  className?: string
  popupClassName?: string
  listClassName?: string
  itemClassName?: string
  positionerClassName?: string
  startIcon?: ReactNode
  width?: CSSProperties['width']
  align?: SelectPositionerProps['align']
  side?: SelectPositionerProps['side']
  sideOffset?: SelectPositionerProps['sideOffset']
  'aria-label'?: string
}

export function Select<Value extends SelectPrimitiveValue = string>({
  align = 'start',
  className,
  itemClassName,
  items,
  listClassName,
  placeholder,
  popupClassName,
  positionerClassName,
  side = 'bottom',
  sideOffset = 4,
  startIcon,
  width,
  'aria-label': ariaLabel,
  ...rootProps
}: SelectProps<Value>) {
  const selectItems = items.filter(isSelectItem).map((item) => ({
    label: item.label,
    value: item.value,
  }))

  return (
    <BaseSelect.Root<Value> {...rootProps} items={selectItems}>
      <BaseSelect.Trigger
        aria-label={ariaLabel}
        className={cx('ui-control ui-focusRing', styles.selectTrigger, className)}
        data-has-icon={startIcon ? '' : undefined}
        style={width != null ? ({ '--primitive-select-width': toCssSize(width) } as CSSProperties) : undefined}
      >
        {startIcon ? <span className={styles.selectStartIcon}>{startIcon}</span> : null}
        <BaseSelect.Value className={styles.selectValue} placeholder={placeholder} />
        <BaseSelect.Icon className={styles.selectIcon}>
          <ChevronIcon />
        </BaseSelect.Icon>
      </BaseSelect.Trigger>

      <BaseSelect.Portal>
        <BaseSelect.Positioner
          align={align}
          alignItemWithTrigger={false}
          className={cx(styles.positioner, positionerClassName)}
          side={side}
          sideOffset={sideOffset}
        >
          <BaseSelect.Popup className={cx('ui-popup', styles.popup, popupClassName)}>
            <BaseSelect.List className={cx(styles.selectList, listClassName)}>
              {items.map((item, index) =>
                isSelectItem(item) ? (
                  <BaseSelect.Item
                    className={cx('ui-menuRow', styles.selectItem, itemClassName)}
                    disabled={item.disabled}
                    key={String(item.value)}
                    value={item.value}
                  >
                    <BaseSelect.ItemIndicator className={cx('ui-indicator', styles.indicator)}>
                      <Checkmark />
                    </BaseSelect.ItemIndicator>
                    <BaseSelect.ItemText className="ui-itemText">{item.label}</BaseSelect.ItemText>
                  </BaseSelect.Item>
                ) : (
                  <BaseSelect.Separator className={cx('ui-separator', styles.separator)} key={item.id ?? index} />
                ),
              )}
            </BaseSelect.List>
          </BaseSelect.Popup>
        </BaseSelect.Positioner>
      </BaseSelect.Portal>
    </BaseSelect.Root>
  )
}

function ChevronIcon() {
  return (
    <svg className={styles.chevronIcon} viewBox="0 0 8 6" aria-hidden="true">
      <path className={styles.chevronPath} d="M0.75 1.5 4 4.75 7.25 1.5" />
    </svg>
  )
}

function isSelectItem<Value extends SelectPrimitiveValue>(
  item: SelectEntry<Value>,
): item is SelectItemConfig<Value> {
  return !('type' in item)
}
