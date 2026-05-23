import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import '../index.css';
import { initFeatures } from '../modeling/features/init';
import { routeTree } from './routeTree.gen';

initFeatures();

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
