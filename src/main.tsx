import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initFeatures } from './features/init'

initFeatures();

// /demo-player skips StrictMode: it owns a singleton WebGL renderer/canvas whose
// lifecycle doesn't tolerate the double-mount StrictMode triggers in dev.
const isDemoPlayer =
  typeof window !== 'undefined' && window.location.pathname === '/demo-player';

createRoot(document.getElementById('root')!).render(
  isDemoPlayer ? <App /> : <StrictMode><App /></StrictMode>,
)
