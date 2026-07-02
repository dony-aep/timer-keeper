import { useMemo, useState } from 'react'
import { formatTime, formatPercent } from '../../lib/time'
import styles from './DonutChart.module.css'

export interface DonutChartItem {
  id: string
  label: string
  seconds: number
}

interface DonutChartProps {
  items: DonutChartItem[]
  /** Empty-state copy, shown when there's nothing to plot. */
  emptyLabel?: string
}

/** r chosen so the circumference is exactly 100 — segment lengths == percentages. */
const RADIUS = 15.915494
const STROKE = 6
const VIEW = 42
const CENTER = VIEW / 2

/**
 * Cold-grey ramp: the largest slice is brightest (#e8), stepping down to a dark
 * floor for the smallest — rank & proportion read from LUMINANCE, never hue.
 */
function greyRamp(count: number): string[] {
  const HI = 232
  const LO = 78
  if (count <= 1) return [`rgb(${HI},${HI},${HI})`]
  const out: string[] = []
  for (let i = 0; i < count; i++) {
    const v = Math.round(HI + (LO - HI) * (i / (count - 1)))
    out.push(`rgb(${v},${v},${v})`)
  }
  return out
}

/**
 * Monochrome donut of the time distribution, drawn as individual SVG arcs so
 * each slice is independently hoverable. Hovering a slice (or focusing its
 * legend row) surfaces that project's readout in the ring's hole; the legend is
 * the keyboard-navigable, screen-reader accessible representation.
 */
export function DonutChart({ items, emptyLabel = 'No data yet.' }: DonutChartProps) {
  const [activeId, setActiveId] = useState<string | null>(null)

  const total = items.reduce((sum, i) => sum + i.seconds, 0)

  const segments = useMemo(() => {
    const ramp = greyRamp(items.length)
    const gap = items.length > 1 ? 1.5 : 0
    let acc = 0
    return items.map((item, i) => {
      const fraction = total > 0 ? item.seconds / total : 0
      const start = acc * 100 // percent along the circle (before this slice)
      acc += fraction
      const len = fraction * 100
      const drawLen = Math.max(len - gap, 0.4)
      return {
        ...item,
        color: ramp[i],
        fraction,
        dashArray: `${drawLen} ${100 - drawLen}`,
        dashOffset: 25 - start, // 25 = start drawing from 12 o'clock, clockwise
      }
    })
  }, [items, total])

  if (items.length === 0 || total <= 0) {
    return <p className={styles.empty}>{emptyLabel}</p>
  }

  const active = activeId ? segments.find((s) => s.id === activeId) : null

  return (
    <div className={styles.chart}>
      <div className={styles.ringWrap} data-active={active ? '' : undefined}>
        <svg
          className={styles.svg}
          viewBox={`0 0 ${VIEW} ${VIEW}`}
          role="img"
          aria-label={`Time distribution donut across ${items.length} project${items.length === 1 ? '' : 's'}`}
        >
          {segments.map((seg) => {
            const isActive = seg.id === activeId
            const className = `${styles.seg} ${isActive ? styles.segActive : ''}`
            return (
              <circle
                key={seg.id}
                className={className}
                cx={CENTER}
                cy={CENTER}
                r={RADIUS}
                fill="none"
                stroke={seg.color}
                strokeWidth={STROKE}
                strokeDasharray={seg.dashArray}
                strokeDashoffset={seg.dashOffset}
                onMouseEnter={() => setActiveId(seg.id)}
                onMouseLeave={() => setActiveId((cur) => (cur === seg.id ? null : cur))}
              >
                <title>{`${seg.label} — ${formatTime(seg.seconds)} (${formatPercent(seg.fraction)})`}</title>
              </circle>
            )
          })}
        </svg>

        <div className={styles.center} aria-hidden="true">
          {active ? (
            <>
              <span className={styles.centerName} title={active.label}>
                {active.label}
              </span>
              <span className={styles.centerValue}>{formatTime(active.seconds)}</span>
              <span className={styles.centerLabel}>{formatPercent(active.fraction)}</span>
            </>
          ) : (
            <>
              <span className={styles.centerValue}>{formatTime(total)}</span>
              <span className={styles.centerLabel}>shown</span>
            </>
          )}
        </div>
      </div>

      <ul className={styles.legend} aria-label="Time distribution by project">
        {segments.map((seg, i) => {
          const isActive = seg.id === activeId
          return (
            <li
              key={seg.id}
              className={`${styles.item} ${isActive ? styles.itemActive : ''}`}
              style={{ animationDelay: `${i * 35}ms` }}
              tabIndex={0}
              aria-label={`${seg.label}: ${formatTime(seg.seconds)}, ${formatPercent(seg.fraction)}`}
              onMouseEnter={() => setActiveId(seg.id)}
              onMouseLeave={() => setActiveId((cur) => (cur === seg.id ? null : cur))}
              onFocus={() => setActiveId(seg.id)}
              onBlur={() => setActiveId((cur) => (cur === seg.id ? null : cur))}
            >
              <span className={styles.swatch} style={{ background: seg.color }} aria-hidden="true" />
              <span className={styles.name} aria-hidden="true" title={seg.label}>
                {seg.label}
              </span>
              <span className={styles.percent} aria-hidden="true">
                {formatPercent(seg.fraction)}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
