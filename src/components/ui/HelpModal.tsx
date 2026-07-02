import { useState } from 'react'
import { IconButton, Button } from './Button'
import { PanelDialog } from './Modal'
import { Icon } from './Icon'
import { useCSInterface } from '../../hooks/useCSInterface'
import { useToasts } from '../toast/ToastProvider'
import styles from './HelpModal.module.css'

const DOC_URL = 'https://toolsbydonyaep.vercel.app/extension/timer-keeper'

/** Static help content + data-folder/contact actions. Parity with the v3 Help modal. */
function HelpContent() {
  const cep = useCSInterface()
  const { push } = useToasts()

  const openDataFolder = async () => {
    const raw = await cep.evalTS('getDataFolderPath()')
    if (!raw || raw === 'false') {
      push('Could not access the data folder location.', 'error')
      return
    }
    cep.openURL('file:///' + raw.replace(/\\/g, '/'))
    push('Opening data folder location…', 'success')
  }

  return (
    <>
      <section className={styles.section}>
        <h3 className={styles.heading}>Main Functions</h3>
        <ul className={styles.list}>
          <li>Start / Pause: begin or stop tracking time for the current project.</li>
          <li>Reset: clear the accumulated time for the selected project.</li>
          <li>Auto-save: time is saved continuously while the timer runs.</li>
          <li>Time display: shows accumulated time in HH:MM:SS, updated every second.</li>
        </ul>
      </section>

      <section className={styles.section}>
        <h3 className={styles.heading}>Project Management</h3>
        <ul className={styles.list}>
          <li>Double-click a project to open and automatically start timing it.</li>
          <li>Use search to filter projects by name.</li>
          <li>Delete removes a project and its timing data from the list.</li>
          <li>Refresh reloads the project list from disk.</li>
        </ul>
      </section>

      <section className={styles.section}>
        <h3 className={styles.heading}>Automatic Features</h3>
        <ul className={styles.list}>
          <li>Real-time tracking with automatic saving.</li>
          <li>Project-change detection, with auto-start for projects that already have time.</li>
          <li>Unsaved and version-converting projects pause automatically.</li>
          <li>Today's total resets at midnight, tracked per calendar day.</li>
        </ul>
      </section>

      <section className={`${styles.section} ${styles.tips}`}>
        <h3 className={styles.heading}>Important Tips</h3>
        <ul className={styles.list}>
          <li>Save your project before starting the timer.</li>
          <li>Pause the timer before switching between projects.</li>
          <li>Use the Dashboard tab to see your total time statistics.</li>
        </ul>
      </section>

      <section className={styles.section}>
        <h3 className={styles.heading}>Data Management</h3>
        <p className={styles.paragraph}>
          Your project timing data is saved automatically to a JSON file in your Adobe user
          folder, and persists between sessions.
        </p>
        <Button variant="outline" icon="folder_open" onPress={() => void openDataFolder()}>
          Open Data Location
        </Button>
      </section>

      <section className={styles.section}>
        <h3 className={styles.heading}>Contact</h3>
        <p className={styles.paragraph}>For support and updates, visit:</p>
        <div className={styles.contactRow}>
          <span className={styles.url}>{DOC_URL.replace('https://', '')}</span>
          <Button variant="outline" icon="open_in_new" onPress={() => cep.openURL(DOC_URL)}>
            Visit
          </Button>
        </div>
      </section>
    </>
  )
}

export function HelpModal() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <IconButton icon="help" aria-label="Help and documentation" onPress={() => setIsOpen(true)} />
      <PanelDialog
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        title="Help & Documentation"
        footer={(close) => (
          <>
            <span className={styles.watermark}>
              <Icon name="timer" size={14} />
              Timer Keeper v{__APP_VERSION__}
            </span>
            <Button variant="outline" onPress={close}>
              Close
            </Button>
          </>
        )}
      >
        {() => <HelpContent />}
      </PanelDialog>
    </>
  )
}
