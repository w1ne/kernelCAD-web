import { createRootRoute, Outlet } from '@tanstack/react-router';
import { Suspense, lazy } from 'react';

const TanStackRouterDevtools = import.meta.env.DEV
  ? lazy(() =>
      import('@tanstack/router-devtools').then(d => ({ default: d.TanStackRouterDevtools })),
    )
  : () => null;

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  return (
    <>
      <Outlet />
      <Suspense fallback={null}>
        <TanStackRouterDevtools position="bottom-right" />
      </Suspense>
    </>
  );
}
