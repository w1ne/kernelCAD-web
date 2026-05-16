import { createRootRoute, Outlet } from '@tanstack/react-router';
import { Suspense, lazy } from 'react';

const TanStackRouterDevtools = import.meta.env.DEV
  ? lazy(() =>
      import('@tanstack/router-devtools').then(d => ({ default: d.TanStackRouterDevtools })),
    )
  : () => null;

// Headless renderers (kernelcad render, scoreReference) navigate with
// ?headless=1 to suppress all dev-mode chrome. Bleeding the TanStack devtools
// badge into a score PNG corrupts silhouette / SSIM / pHash gates.
function isHeadlessRender(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('headless') === '1';
}

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  const headless = isHeadlessRender();
  return (
    <>
      <Outlet />
      {!headless && (
        <Suspense fallback={null}>
          <TanStackRouterDevtools position="bottom-right" />
        </Suspense>
      )}
    </>
  );
}
