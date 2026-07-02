import { useMemo, useState } from 'react'
import { ToggleButton, ToggleButtonGroup } from 'react-aria-components'
import { useTimer } from '../../context/TimerContext'
import { StatCard } from '../ui/StatCard'
import { DonutChart } from '../ui/DonutChart'
import { BarList } from '../ui/BarList'
import { Icon } from '../ui/Icon'
import { totalSeconds, todaySeconds } from '../../lib/store'
import { dayKey, formatTime } from '../../lib/time'
import styles from './DashboardTab.module.css'

const TOP_COUNT = 5

type ChartType = 'donut' | 'bar'

export function DashboardTab() {
  const { store } = useTimer()
  const [showAll, setShowAll] = useState(false)
  const [chartType, setChartType] = useState<ChartType>('donut')

  const total = useMemo(() => totalSeconds(store), [store])
  const today = useMemo(() => todaySeconds(store, dayKey()), [store])
  const projectCount = store.projects.length

  const ranked = useMemo(
    () => [...store.projects].sort((a, b) => b.totalSeconds - a.totalSeconds),
    [store.projects],
  )
  const visible = showAll ? ranked : ranked.slice(0, TOP_COUNT)
  const hiddenCount = Math.max(ranked.length - TOP_COUNT, 0)

  return (
    <div className={styles.tab}>
      <section className={styles.stats} aria-label="Summary">
        <StatCard icon="hourglass_top" label="Total tracked" value={formatTime(total)} />
        <StatCard icon="today" label="Today" value={formatTime(today)} />
        <StatCard icon="folder_open" label="Projects" value={String(projectCount)} />
      </section>

      <section className={styles.distribution} aria-label="Time distribution">
        <div className={styles.distributionHeader}>
          <h2 className={styles.panelTitle}>Distribution</h2>
          <div className={styles.controls}>
            <ToggleButtonGroup
              className={styles.toggleGroup}
              selectionMode="single"
              disallowEmptySelection
              selectedKeys={[chartType]}
              onSelectionChange={(keys) => {
                setChartType(keys.has('bar') ? 'bar' : 'donut')
              }}
              aria-label="Chart type"
            >
              <ToggleButton id="donut" className={styles.iconToggle} aria-label="Donut chart">
                <Icon name="donut_large" size={16} />
              </ToggleButton>
              <ToggleButton id="bar" className={styles.iconToggle} aria-label="Bar chart">
                <Icon name="bar_chart" size={16} />
              </ToggleButton>
            </ToggleButtonGroup>

            {hiddenCount > 0 || showAll ? (
              <ToggleButtonGroup
                className={styles.toggleGroup}
                selectionMode="single"
                disallowEmptySelection
                selectedKeys={[showAll ? 'all' : 'top']}
                onSelectionChange={(keys) => {
                  setShowAll(keys.has('all'))
                }}
                aria-label="Number of projects shown"
              >
                <ToggleButton id="top" className={styles.toggleButton}>
                  Top {TOP_COUNT}
                </ToggleButton>
                <ToggleButton id="all" className={styles.toggleButton}>
                  All ({ranked.length})
                </ToggleButton>
              </ToggleButtonGroup>
            ) : null}
          </div>
        </div>

        {chartType === 'donut' ? (
          <DonutChart
            items={visible.map((p) => ({ id: p.path, label: p.title, seconds: p.totalSeconds }))}
            emptyLabel="No projects tracked yet."
          />
        ) : (
          <BarList
            items={visible.map((p) => ({ id: p.path, label: p.title, seconds: p.totalSeconds }))}
            emptyLabel="No projects tracked yet."
          />
        )}
      </section>
    </div>
  )
}
