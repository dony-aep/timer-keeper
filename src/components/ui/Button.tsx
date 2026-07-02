import { Button as AriaButton, type ButtonProps as AriaButtonProps } from 'react-aria-components'
import type { ReactNode } from 'react'
import { Icon } from './Icon'
import styles from './controls.module.css'

export type ButtonVariant = 'key' | 'outline' | 'ghost'

interface ButtonProps extends Omit<AriaButtonProps, 'className' | 'children'> {
  /** 'key' = inverted primary (console key), 'outline' = hairline, 'ghost' = quiet. */
  variant?: ButtonVariant
  icon?: string
  /** Animate the icon's FILL axis (0 -> 1). */
  iconFilled?: boolean
  className?: string
  children?: ReactNode
}

export function Button({
  variant = 'outline',
  icon,
  iconFilled = false,
  className,
  children,
  ...rest
}: ButtonProps) {
  const classes = [styles.button, styles[variant]]
  if (className) classes.push(className)
  return (
    <AriaButton {...rest} className={classes.join(' ')}>
      {icon ? <Icon name={icon} size={17} filled={iconFilled} /> : null}
      {children ? <span className={styles.buttonLabel}>{children}</span> : null}
    </AriaButton>
  )
}

interface IconButtonProps extends Omit<AriaButtonProps, 'className' | 'children' | 'aria-label'> {
  icon: string
  /** Required — icon-only controls must always be named. */
  'aria-label': string
  size?: number
  className?: string
}

export function IconButton({ icon, size = 18, className, ...rest }: IconButtonProps) {
  const classes = [styles.iconButton]
  if (className) classes.push(className)
  return (
    <AriaButton {...rest} className={classes.join(' ')}>
      <Icon name={icon} size={size} />
    </AriaButton>
  )
}
