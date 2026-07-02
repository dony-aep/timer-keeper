import type { ReactNode } from 'react'
import { Button } from './Button'
import { PanelDialog } from './Modal'
import styles from './ConfirmDialog.module.css'

export interface ConfirmRequest {
  message: ReactNode
  onConfirm: () => void
}

interface ConfirmDialogProps {
  request: ConfirmRequest | null
  onClose: () => void
}

/** Yes/No confirmation (v3 parity). Escape / scrim / No all cancel. */
export function ConfirmDialog({ request, onClose }: ConfirmDialogProps) {
  return (
    <PanelDialog
      isOpen={request !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title="Confirm"
      role="alertdialog"
      compact
      footer={(close) => (
        <div className={styles.actions}>
          <Button
            variant="key"
            onPress={() => {
              request?.onConfirm()
              close()
            }}
          >
            Yes
          </Button>
          <Button variant="outline" onPress={close}>
            No
          </Button>
        </div>
      )}
    >
      {() => <p className={styles.message}>{request?.message}</p>}
    </PanelDialog>
  )
}
