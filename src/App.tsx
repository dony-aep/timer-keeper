import { useEffect } from 'react'
import { Tabs, TabList, Tab, TabPanel } from 'react-aria-components'
import { useCSInterface } from './hooks/useCSInterface'
import { TimerTab } from './components/tabs/TimerTab'
import { DashboardTab } from './components/tabs/DashboardTab'
import { HelpModal } from './components/ui/HelpModal'
import { Icon } from './components/ui/Icon'
import styles from './App.module.css'

const DOC_URL = 'https://toolsbydonyaep.vercel.app/extension/timer-keeper'

const TABS = [
  { id: 'timer', label: 'Timer', icon: 'timer', Panel: TimerTab },
  { id: 'dashboard', label: 'Dashboard', icon: 'monitoring', Panel: DashboardTab },
]

export function App() {
  const { openURL, setPanelFlyout, addEventListener, removeEventListener } = useCSInterface()

  useEffect(() => {
    const version = `v${__APP_VERSION__}`
    setPanelFlyout(
      `<Menu>` +
        `<MenuItem Id="refreshPanel" Label="Refresh Timer Keeper ${version}" Enabled="true"/>` +
        `<MenuItem Id="separator" Label="---" Enabled="false"/>` +
        `<MenuItem Id="documentationLink" Label="Open Documentation" Enabled="true"/>` +
        `</Menu>`,
    )
    const handler = (event: CSEvent) => {
      const id = (event.data as unknown as { menuId: string }).menuId
      if (id === 'refreshPanel') location.reload()
      else if (id === 'documentationLink') openURL(DOC_URL)
    }
    addEventListener('com.adobe.csxs.events.flyoutMenuClicked', handler)
    return () => removeEventListener('com.adobe.csxs.events.flyoutMenuClicked', handler)
  }, [openURL, setPanelFlyout, addEventListener, removeEventListener])

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
        <HelpModal />
      </footer>
    </div>
  )
}
