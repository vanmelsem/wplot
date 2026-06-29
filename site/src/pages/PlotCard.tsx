import type { ReactNode } from 'react'
import type { Plot as PlotInstance, Plugin, RgbaColor } from 'wplot'

import { Plot } from '../Plot'
import type { PlotInitProps } from '../Plot'
import { cssRgba } from './theme'
import styles from './pages.module.css'

export type LegendItem = { label: string; color: RgbaColor }

export type PlotCardProps = {
  title: ReactNode
  meta?: ReactNode
  /** Optional fixed pixel height; omit to flex-fill the available space. */
  height?: number
  init: PlotInitProps
  onReady?: (plot: PlotInstance) => void
  plugins?: readonly Plugin[]
  legend?: readonly LegendItem[]
}

/**
 * A #060606 card delineated only by its panel shadow, wrapping a fixed-height
 * Plot host plus an optional header and legend strip. Shared by the telemetry,
 * streaming and load pages so every plot reads consistently.
 */
export function PlotCard({
  title,
  meta,
  height,
  init,
  onReady,
  plugins,
  legend,
}: PlotCardProps) {
  return (
    <article className={styles.panel}>
      <div className={styles.panelHead}>
        <span className={styles.panelTitle}>{title}</span>
        {meta != null ? <span className={styles.panelMeta}>{meta}</span> : null}
      </div>
      <div
        className={styles.panelBody}
        style={height != null ? { flex: 'none', height } : undefined}
      >
        <Plot init={init} onReady={onReady} plugins={plugins} />
      </div>
      {legend && legend.length > 0 ? (
        <div className={styles.legend}>
          {legend.map((item) => (
            <span className={styles.legendItem} key={item.label}>
              <span
                className={styles.legendSwatch}
                style={{ background: cssRgba(item.color) }}
              />
              {item.label}
            </span>
          ))}
        </div>
      ) : null}
    </article>
  )
}

export default PlotCard
