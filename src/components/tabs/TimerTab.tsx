import { useMemo, useState } from 'react'
import { ListBox, ListBoxItem } from 'react-aria-components'
import { useTimer } from '../../context/TimerContext'
import { useToasts } from '../toast/ToastProvider'
import { Button, IconButton } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { SearchField } from '../ui/SearchField'
import { ConfirmDialog, type ConfirmRequest } from '../ui/ConfirmDialog'
import { basename } from '../../lib/store'
import { formatTime, formatDescriptive } from '../../lib/time'
import styles from './TimerTab.module.css'

/**
 * HH:MM:SS split into standalone digit groups + colon spans so the colons
 * (and only the colons) can pulse while the timer runs. Descriptive format
 * has no fixed shape, so it renders as plain tabular text instead.
 */
function TimeReadout({
  seconds,
  descriptive,
  running,
}: {
  seconds: number
  descriptive: boolean
  running: boolean
}) {
  const timeClass = running ? `${styles.time} ${styles.timeLive}` : styles.time
  if (descriptive) {
    return <span className={timeClass}>{formatDescriptive(seconds)}</span>
  }
  const [h, m, s] = formatTime(seconds).split(':')
  const colonClass = running ? `${styles.colon} ${styles.colonLive}` : styles.colon
  return (
    <span className={timeClass}>
      {h}
      <span className={colonClass}>:</span>
      {m}
      <span className={colonClass}>:</span>
      {s}
    </span>
  )
}

export function TimerTab() {
  const {
    store,
    running,
    currentProject,
    elapsedSeconds,
    snapshot,
    convertedPending,
    useDescriptiveFormat,
    start,
    pause,
    resetProject,
    removeProject,
    refresh,
    openProject,
    toggleTimeFormat,
  } = useTimer()
  const { push } = useToasts()

  const [query, setQuery] = useState('')
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null)

  const filteredProjects = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = q ? store.projects.filter((p) => p.title.toLowerCase().includes(q)) : store.projects
    return list
  }, [store.projects, query])

  const selectedProject = selectedPath
    ? (store.projects.find((p) => p.path === selectedPath) ?? null)
    : null

  const projectLabel = snapshot?.unsaved
    ? convertedPending
      ? `${convertedPending.title} (converted)*` // opened via the panel; AE made an unsaved converted copy
      : 'Untitled Project*'
    : !snapshot?.projectPath
      ? 'No project open'
      : (currentProject?.title ?? snapshot.projectName ?? basename(snapshot.projectPath))

  const requestReset = () => {
    if (running) {
      push('Please pause the timer before resetting a project.', 'warning')
      return
    }
    if (!selectedProject) return
    setConfirm({
      message: (
        <>
          Reset the timer for <strong>{selectedProject.title}</strong>? This cannot be undone.
        </>
      ),
      onConfirm: () => resetProject(selectedProject.path),
    })
  }

  const requestDelete = () => {
    if (running) {
      push('Please pause the timer before deleting a project.', 'warning')
      return
    }
    if (!selectedProject) return
    setConfirm({
      message: (
        <>
          Delete <strong>{selectedProject.title}</strong> and its tracked time? This cannot be
          undone.
        </>
      ),
      onConfirm: () => {
        removeProject(selectedProject.path)
        setSelectedPath(null)
      },
    })
  }

  return (
    <div className={styles.tab}>
      <section className={styles.display} aria-label="Timer">
        <div className={styles.readoutRow}>
          <TimeReadout seconds={elapsedSeconds} descriptive={useDescriptiveFormat} running={running} />
          <IconButton
            icon="swap_horiz"
            aria-label="Toggle time format"
            size={16}
            onPress={toggleTimeFormat}
          />
        </div>

        <div className={styles.projectRow}>
          <Icon name="movie" size={14} />
          <span className={styles.projectName}>{projectLabel}</span>
        </div>

        <div className={styles.transport}>
          <Button
            variant="key"
            icon={running ? 'pause' : 'play_arrow'}
            iconFilled={running}
            onPress={running ? pause : start}
          >
            {running ? 'Pause' : 'Start'}
          </Button>
          <Button
            variant="outline"
            icon="restart_alt"
            isDisabled={!selectedProject || running}
            onPress={requestReset}
          >
            Reset
          </Button>
        </div>
      </section>

      <section className={styles.listPanel} aria-label="Tracked projects">
        <div className={styles.listHeader}>
          <h2 className={styles.panelTitle}>Projects</h2>
          <SearchField
            aria-label="Search projects"
            placeholder="Search projects…"
            value={query}
            onChange={setQuery}
          />
        </div>

        {filteredProjects.length === 0 ? (
          <div className={styles.empty}>
            {store.projects.length === 0 ? 'No projects tracked yet.' : 'No matches.'}
          </div>
        ) : (
          <ListBox
            aria-label="Tracked projects"
            items={filteredProjects}
            selectionMode="single"
            selectionBehavior="replace"
            selectedKeys={selectedPath ? [selectedPath] : []}
            onSelectionChange={(keys) => {
              if (keys === 'all') return
              const [first] = keys
              setSelectedPath(first != null ? String(first) : null)
            }}
            className={styles.list}
          >
            {(project) => (
              <ListBoxItem
                id={project.path}
                textValue={project.title}
                onAction={() => void openProject(project.path)}
                className={styles.row}
              >
                <span className={styles.rowTitle}>{project.title}</span>
                <span className={styles.rowTime}>{formatTime(project.totalSeconds)}</span>
              </ListBoxItem>
            )}
          </ListBox>
        )}

        <div className={styles.listActions}>
          <Button
            variant="outline"
            icon="delete"
            isDisabled={!selectedProject || running}
            onPress={requestDelete}
          >
            Delete
          </Button>
          <IconButton icon="refresh" aria-label="Refresh project data" onPress={() => void refresh()} />
        </div>
      </section>

      <ConfirmDialog request={confirm} onClose={() => setConfirm(null)} />
    </div>
  )
}
