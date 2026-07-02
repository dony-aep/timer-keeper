import {
  Dialog,
  Heading,
  Modal as AriaModal,
  ModalOverlay,
} from 'react-aria-components'
import type { ReactNode } from 'react'
import { IconButton } from './Button'
import styles from './Modal.module.css'

interface PanelDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  title: string
  /** Compact width for confirm-style dialogs. */
  compact?: boolean
  role?: 'dialog' | 'alertdialog'
  /** Render-prop children receive `close`. */
  children: (close: () => void) => ReactNode
  /** Optional footer, also receives `close`. */
  footer?: (close: () => void) => ReactNode
}

/**
 * Shared modal chrome: scrim, hairline panel, uppercase micro-title,
 * close X, scrollable body and optional footer. Built on react-aria
 * Dialog (focus trap, Escape, keyboard) — fully monochrome.
 */
export function PanelDialog({
  isOpen,
  onOpenChange,
  title,
  compact = false,
  role = 'dialog',
  children,
  footer,
}: PanelDialogProps) {
  return (
    <ModalOverlay
      className={styles.overlay}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      isDismissable
    >
      <AriaModal className={compact ? `${styles.modal} ${styles.compact}` : styles.modal}>
        <Dialog role={role} className={styles.dialog}>
          {({ close }) => (
            <>
              <header className={styles.header}>
                <Heading slot="title" className={styles.title}>
                  {title}
                </Heading>
                <IconButton icon="close" aria-label="Close dialog" onPress={close} />
              </header>
              <div className={styles.body}>{children(close)}</div>
              {footer ? <footer className={styles.footer}>{footer(close)}</footer> : null}
            </>
          )}
        </Dialog>
      </AriaModal>
    </ModalOverlay>
  )
}
