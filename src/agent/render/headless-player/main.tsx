// src/agent/render/headless-player/main.tsx
//
// Entry for the standalone headless player bundle (see index.html). Mounts
// DemoPlayerPage directly — no TanStack router, no studio shell — because the
// headless render pipeline drives the page exclusively through the
// window.__demoPlayer bridge and query params (?headless=1 etc.), which the
// page reads from window.location itself.

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { DemoPlayerPage } from '../../../studio/components/demoPlayer/DemoPlayerPage';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DemoPlayerPage />
  </StrictMode>,
);
