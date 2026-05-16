import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import '../index.css';
import { initFeatures } from '../modeling/features/init';
import { GeometryEngine } from '../shared/worker/geometryEngine';
import { routeTree } from './routeTree.gen';

initFeatures();

// Eagerly spawn the OCCT worker so its 11 MB WASM fetch + compile overlap with React's
// first render. The singleton dedupes; later mounts are no-ops. Failures surface through
// GeometryProvider's existing retry path.
GeometryEngine.getInstance().initialize().catch(() => { /* see provider */ });

const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

// /demo-player skips StrictMode: it owns a singleton WebGL renderer/canvas whose
// lifecycle doesn't tolerate the double-mount StrictMode triggers in dev.
const isDemoPlayer =
  typeof window !== 'undefined' && window.location.pathname === '/demo-player';

const root = createRoot(document.getElementById('root')!);

if (isDemoPlayer) {
  root.render(<RouterProvider router={router} />);
} else {
  root.render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  );
}
