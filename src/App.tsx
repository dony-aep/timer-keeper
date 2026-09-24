import { useEffect } from 'react'
import { Tabs, TabList, Tab, TabPanel } from 'react-aria-components'
import { useCSInterface } from './hooks/useCSInterface'
import { useUpdateCheck } from './hooks/useUpdateCheck'
import { useToasts } from './components/toast/ToastProvider'
import { useTimer } from './context/TimerContext'
import { IDLE_OPTIONS_MINUTES } from './lib/idle'
import { TimerTab } from './components/tabs/TimerTab'
import { DashboardTab } from './components/tabs/DashboardTab'
import { HelpModal } from './components/ui/HelpModal'
import { Icon } from './components/ui/Icon'
import styles from './App.module.css'

const DOC_URL = 'https://toolsbydonyaep.vercel.app/extension/timer-keeper'

const TABS = [
  { id: 'timer', label: 'Timer', icon: 'timer', Panel: TimerTab },
  { id: 'dashboard', label: 'Dashboard', icon: 'monitoring', Panel: DashboardTab },
] as const

export function App() {
  const { openURL, setPanelFlyout, addEventListener, removeEventListener } = useCSInterface()
  const { update, checkNow } = useUpdateCheck()
  const { push } = useToasts()
  const { idleThreshold, setIdleThreshold } = useTimer()

  useEffect(() => {
    const version = `v${__APP_VERSION__}`
    const idleItem = (seconds: number, label: string) =>
      `<MenuItem Id="idle:${seconds}" Label="${label}" Enabled="true" Checkable="true" Checked="${idleThreshold === seconds}"/>`
    setPanelFlyout(
      `<Menu>` +
        `<MenuItem Id="refreshPanel" Label="Refresh Timer Keeper ${version}" Enabled="true"/>` +
        `<MenuItem Id="separator" Label="---" Enabled="false"/>` +
        `<MenuItem Id="idleMenu" Label="Auto-pause when idle">` +
        idleItem(0, 'Off') +
        IDLE_OPTIONS_MINUTES.map((m) => idleItem(m * 60, `After ${m} min`)).join('') +
        `</MenuItem>` +
        `<MenuItem Id="separator2" Label="---" Enabled="false"/>` +
        `<MenuItem Id="checkUpdates" Label="Check for Updates" Enabled="true"/>` +
        `<MenuItem Id="documentationLink" Label="Open Documentation" Enabled="true"/>` +
        `</Menu>`,
    )
    const handler = (event: CSEvent) => {
      const id = (event.data as unknown as { menuId: string }).menuId
      if (id.startsWith('idle:')) {
        const seconds = Number(id.slice('idle:'.length))
        setIdleThreshold(seconds)
        push(
          seconds > 0
            ? `The timer will pause after ${seconds / 60} min without activity.`
            : 'Auto-pause when idle is off.',
          'info',
        )
      } else if (id === 'refreshPanel') location.reload()
      else if (id === 'documentationLink') openURL(DOC_URL)
      else if (id === 'checkUpdates') {
        void checkNow().then((result) => {
          if (result.status === 'update') {
            push(`Timer Keeper v${result.update.version} is available.`, 'info')
          } else if (result.status === 'up-to-date') {
            push(`You're on the latest version (v${__APP_VERSION__}).`, 'success')
          } else {
            push("Couldn't check for updates. Please try again later.", 'warning')
          }
        })
      }
    }
    addEventListener('com.adobe.csxs.events.flyoutMenuClicked', handler)
    return () => removeEventListener('com.adobe.csxs.events.flyoutMenuClicked', handler)
  }, [openURL, setPanelFlyout, addEventListener, removeEventListener, checkNow, push, idleThreshold, setIdleThreshold])

  return (
    <div className={styles.app}>
      <Tabs className={styles.tabs} defaultSelectedKey="timer">
        <TabList className={styles.tabList} aria-label="Sections">
          {TABS.map((t) => (
            <Tab key={t.id} id={t.id} className={styles.tab}>
              <Icon name={t.icon} size={16} />
              <span>{t.label}</span>
            </Tab>
          ))}
        </TabList>
        {TABS.map((t) => (
          <TabPanel key={t.id} id={t.id} className={styles.panel}>
            <t.Panel />
          </TabPanel>
        ))}
      </Tabs>

      <footer className={styles.footer}>
        <span className={styles.madeBy}>
          Made by{' '}
          <button className={styles.link} onClick={() => openURL('https://donyaep.vercel.app/')}>
            dony.
          </button>
        </span>
        <div className={styles.footerActions}>
          {update ? (
            <button
              className={styles.updateLink}
              title={`Open the Timer Keeper v${update.version} release page`}
              onClick={() => openURL(update.url)}
            >
              <Icon name="arrow_circle_up" size={14} />
              Update v{update.version}
            </button>
          ) : null}
          <HelpModal />
        </div>
      </footer>
    </div>
  )
}
