import { Component, type ErrorInfo, type ReactNode } from 'react'
import styles from './ErrorBoundary.module.css'

interface Props {
  children: ReactNode
}
interface State {
  error: Error | null
}

/** Top-level crash guard. Keeps a runtime error from taking down the whole panel silently. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Timer Keeper crashed:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div className={styles.wrap}>
          <span className="material-symbols-outlined" aria-hidden="true">
            error
          </span>
          <h3 className={styles.title}>Something went wrong</h3>
          <pre className={styles.message}>{this.state.error.message}</pre>
          <button className={styles.reload} onClick={() => location.reload()}>
            Reload panel
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
