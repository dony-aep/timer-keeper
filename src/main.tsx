import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tokens.css'
import './styles/fonts.css'
import './styles/styles.css'
import { App } from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import { TimerProvider } from './context/TimerContext'
import { ToastProvider } from './components/toast/ToastProvider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <TimerProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </TimerProvider>
    </ErrorBoundary>
  </StrictMode>,
)
