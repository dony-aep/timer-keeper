import { Icon } from './Icon'
import styles from './StatCard.module.css'

interface StatCardProps {
  icon: string
  label: string
  value: string
  /** Optional secondary line, e.g. a descriptive duration. */
  sublabel?: string
}

/** A single instrument readout: icon, label, and a tabular numeral value. */
export function StatCard({ icon, label, value, sublabel }: StatCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.head}>
        <Icon name={icon} size={16} className={styles.icon} />
        <span className={styles.label}>{label}</span>
      </div>
      <span className={styles.value}>{value}</span>
      {sublabel ? <span className={styles.sublabel}>{sublabel}</span> : null}
    </div>
  )
}
