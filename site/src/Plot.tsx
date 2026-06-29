import { useEffect, useRef } from 'react'
import type { CSSProperties } from 'react'
import { createPlot } from 'wplot'
import type { Plot as PlotInstance, PlotInit, Plugin } from 'wplot'

/** Everything {@link createPlot} needs except the host element, which we own. */
export type PlotInitProps = Omit<PlotInit, 'host' | 'plugins'>

export type PlotProps = {
  /** Plot configuration: `initialValue`, optional `config`, optional `link`. */
  init: PlotInitProps
  /**
   * Called once the plot exists but before the first frame. This is where the
   * consumer adds series, objects, layers, or wires up subscriptions.
   */
  onReady?: (plot: PlotInstance) => void
  /** Plugins (e.g. `annotations`, `heatmap`) installed at creation time. */
  plugins?: readonly Plugin[]
  /** Keep pointer interactions enabled even on coarse/touch viewports. */
  interactionMode?: 'auto' | 'always'
  className?: string
  style?: CSSProperties
}

/**
 * Thin React wrapper around the imperative wplot library. It owns a host
 * `<div>`; wplot appends its own canvas stack into it and observes its size, so
 * the plot tracks the card it lives in with no manual resize wiring.
 *
 * Lifecycle: on mount we `createPlot`, hand the instance to `onReady`, then
 * `start()`. On unmount we `dispose()`. React 19 StrictMode double-invokes
 * effects in dev; a per-effect local instance plus the cleanup disposer keeps
 * that leak-free — every create is paired with exactly one dispose.
 */
export function Plot({
  init,
  onReady,
  plugins,
  interactionMode = 'auto',
  className,
  style,
}: PlotProps) {
  const hostRef = useRef<HTMLDivElement | null>(null)

  // Keep the latest callbacks/config in refs so the create-once effect always
  // sees current values without re-creating the plot on every render.
  const initRef = useRef(init)
  initRef.current = init
  const onReadyRef = useRef(onReady)
  onReadyRef.current = onReady
  const pluginsRef = useRef(plugins)
  pluginsRef.current = plugins

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const plot = createPlot({
      host,
      ...initRef.current,
      plugins: pluginsRef.current,
    })
    onReadyRef.current?.(plot)
    plot.start()

    // Mobile / touch: make plots display-only so a vertical swipe scrolls the
    // page instead of being captured by the canvas. wplot sets the primary
    // canvas to `touch-action: none`; we relax every canvas to `pan-y` and turn
    // off pointer-driven actions. Desktop keeps full pan/zoom/hover interaction.
    const coarse =
      interactionMode !== 'always' &&
      (window.matchMedia('(pointer: coarse)').matches ||
        window.innerWidth <= 760)
    if (coarse) {
      plot.interaction.setEnabled(false)
      for (const canvas of host.querySelectorAll('canvas')) {
        ;(canvas as HTMLCanvasElement).style.touchAction = 'pan-y'
      }
    }

    // Desktop: while the cursor is over a plot, the wheel drives the plot (zoom)
    // and must NOT scroll the page. wplot's own wheel listener is passive, so it
    // can't cancel the scroll — add a non-passive one here that preventDefaults.
    const blockPageScroll = (e: WheelEvent) => e.preventDefault()
    if (!coarse) {
      host.addEventListener('wheel', blockPageScroll, { passive: false })
    }

    return () => {
      host.removeEventListener('wheel', blockPageScroll)
      plot.dispose()
    }
    // Intentionally mount-only: the plot is driven imperatively after creation.
  }, [interactionMode])

  return (
    <div
      ref={hostRef}
      className={className ? `wplot-host ${className}` : 'wplot-host'}
      style={{ width: '100%', height: '100%', ...style }}
    />
  )
}

export default Plot
