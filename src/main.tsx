import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initFeatures } from './features/init'
import { GeometryEngine } from './lib/geometryEngine'

initFeatures();

// Eagerly spawn the OCCT worker so its 11 MB WASM fetch + compile and the
// OpenCascade bootstrap overlap with React's first render. GeometryProvider
// will call initialize() again on mount; the singleton's `isInitialized`
// flag dedupes, so the second call is a no-op. Failures surface through
// GeometryProvider's existing retry path.
GeometryEngine.getInstance().initialize().catch(() => { /* see provider */ });

// /demo-player skips StrictMode: it owns a singleton WebGL renderer/canvas whose
// lifecycle doesn't tolerate the double-mount StrictMode triggers in dev.
const isDemoPlayer =
  typeof window !== 'undefined' && window.location.pathname === '/demo-player';

createRoot(document.getElementById('root')!).render(
  isDemoPlayer ? <App /> : <StrictMode><App /></StrictMode>,
)
