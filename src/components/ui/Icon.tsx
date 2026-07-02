import styles from './Icon.module.css'

interface IconProps {
  /** Material Symbols glyph name, e.g. "play_arrow". */
  name: string
  /** Font size in px (Material Symbols are square). */
  size?: number
  /** Animate the FILL axis 0 -> 1 (used by the transport key while running). */
  filled?: boolean
  className?: string
}

/**
 * Material Symbols (OUTLINED variant only). Decorative by default —
 * interactive parents must carry their own accessible label.
 */
export function Icon({ name, size = 18, filled = false, className }: IconProps) {
  const classes = ['material-symbols-outlined', styles.icon]
  if (filled) classes.push(styles.filled)
  if (className) classes.push(className)
  return (
    <span aria-hidden="true" className={classes.join(' ')} style={{ fontSize: size }}>
      {name}
    </span>
  )
}
