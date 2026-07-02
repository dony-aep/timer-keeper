import { formatTime, formatPercent } from '../../lib/time'
import styles from './BarList.module.css'

export interface BarListItem {
  id: string
  label: string
  seconds: number
}

interface BarListProps {
  items: BarListItem[]
  /** Empty-state copy, shown when `items` is empty. */
  emptyLabel?: string
}

/**
 * Monochrome horizontal distribution — bar LENGTH is scaled to the largest
 * value (relative rank), while the readout shows each project's share and time.
 * Each row is an accessible, self-describing list item.
 */
export function BarList({ items, emptyLabel = 'No data yet.' }: BarListProps) {
  if (items.length === 0) {
    return <p className={styles.empty}>{emptyLabel}</p>
  }
  const max = Math.max(...items.map((i) => i.seconds), 1)
  const total = items.reduce((sum, i) => sum + i.seconds, 0)
  return (
    <ul className={styles.list} aria-label="Time distribution by project">
      {items.map((item, index) => {
        const fraction = Math.max(item.seconds / max, 0.02)
        const share = total > 0 ? item.seconds / total : 0
        const time = formatTime(item.seconds)
        const pct = formatPercent(share)
        return (
          <li
            key={item.id}
            className={styles.row}
            style={{ animationDelay: `${index * 35}ms` }}
            aria-label={`${item.label}: ${time}, ${pct}`}
            title={`${item.label} — ${time} (${pct})`}
          >
            <div className={styles.head} aria-hidden="true">
              <span className={styles.label}>{item.label}</span>
              <span className={styles.meta}>
                {pct} · {time}
              </span>
            </div>
            <div className={styles.track} aria-hidden="true">
              <div className={styles.fill} style={{ width: `${fraction * 100}%` }} />
            </div>
          </li>
        )
      })}
    </ul>
  )
}
