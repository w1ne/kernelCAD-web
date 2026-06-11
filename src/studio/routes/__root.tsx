// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { createRootRoute, Outlet } from '@tanstack/react-router';
import { Suspense, lazy } from 'react';
import { getSupabase } from '../../funnel/lib/supabaseClient';

// Eagerly instantiate the Supabase client at app boot so its
// `detectSessionInUrl: true` runs on EVERY page load — not just on pages that
// import useSession. Without this, the OAuth redirect lands at `/` with the
// access_token in the URL hash but the hash is never consumed because the
// landing route doesn't import the auth hook. This call is safe (singleton).
//
// Skip in two cases:
//
//   1. Headless render mode (kernelcad render / capture-demo): those flows
//      don't need auth state and shouldn't require Supabase env vars to be
//      present on the rendering box. Detected via ?headless=1.
//   2. Local-dev with missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY:
//      `getSupabase()` throws when env vars are missing, which breaks the
//      Studio's CAD viewer (which doesn't use Supabase at all) for any
//      developer who hasn't copied .env.example → .env.local. We log a
//      one-time warn and skip OAuth wiring so the rest of the app boots.
//      Auth-touching code paths (sign-in, billing) still throw via their
//      own getSupabase() call sites — this only softens the boot-time
//      eager init.
if (typeof window !== 'undefined') {
  const isHeadless = new URLSearchParams(window.location.search).get('headless') === '1';
  if (!isHeadless) {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (url && anonKey) {
      getSupabase();
    } else if (import.meta.env.DEV) {
      // Module-level warn fires once per session; dev-only so production
      // misconfigurations still surface via the strict getSupabase() throw
      // on the first auth-path call.
      // eslint-disable-next-line no-console
      console.warn(
        '[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY missing — OAuth redirect handling disabled. Copy .env.example to .env.local to enable sign-in.',
      );
    }
  }
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
