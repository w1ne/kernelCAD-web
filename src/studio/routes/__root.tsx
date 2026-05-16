import { createRootRoute, Outlet } from '@tanstack/react-router';
import { Suspense, lazy } from 'react';
import { getSupabase } from '../../funnel/lib/supabaseClient';

// Eagerly instantiate the Supabase client at app boot so its
// `detectSessionInUrl: true` runs on EVERY page load — not just on pages that
// import useSession. Without this, the OAuth redirect lands at `/` with the
// access_token in the URL hash but the hash is never consumed because the
// landing route doesn't import the auth hook. This call is safe (singleton).
if (typeof window !== 'undefined') {
  getSupabase();
}

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
