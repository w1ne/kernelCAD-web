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
      {headless && (
        // Belt-and-suspenders: even though we don't render TanStackRouterDevtools
        // when headless, vite HMR or React Strict Mode can briefly mount it.
        // The badge is injected into <body> via a portal, so a global rule on
        // any element WITH the data attribute kills it.
        <style>{`
          [data-testid="tsr-devtools"],
          .TanStackRouterDevtools,
          [data-tanstack-router-devtools] {
            display: none !important;
            visibility: hidden !important;
          }
          /* Vite error overlay too — never let it bleed into a render. */
          vite-error-overlay { display: none !important; }
        `}</style>
      )}
      <Outlet />
      {!headless && (
        <Suspense fallback={null}>
          <TanStackRouterDevtools position="bottom-right" />
        </Suspense>
      )}
    </>
  );
}
