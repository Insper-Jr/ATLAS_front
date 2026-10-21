import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import '@/styles/tema.css'
import App from './App.tsx'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { travarZoom } from '@/utils/travarZoom'
import { registrarServiceWorker } from '@/utils/registrarServiceWorker'

// Fora do React de propósito: os listeners são do documento, não de um
// componente, e no StrictMode um efeito rodaria duas vezes no dev.
travarZoom()
registrarServiceWorker()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
