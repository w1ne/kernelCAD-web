import { test, expect, type Route } from '@playwright/test';

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:5173';

// The tagged test user e2e-bot@kernelcad.com is provisioned by Slice 2 in the
// prod Supabase project. The password lives in KERNELCAD_E2E_TEST_PASSWORD so
// no secret is hardcoded in this repo. If the env var is missing, skip the
// signed-in path with a clear TODO.
const TEST_EMAIL = 'e2e-bot@kernelcad.com';
const TEST_PASSWORD = process.env.KERNELCAD_E2E_TEST_PASSWORD;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? '';
const SUPABASE_ANON = process.env.VITE_SUPABASE_ANON_KEY ?? '';
const API_BASE = process.env.VITE_API_BASE_URL ?? 'https://api.kernelcad.com';

// The synthetic token we hand back when the test stubs out the token API.
// Anything matching kc_e2e_* is safe to grep for in CI logs to confirm no
// real token leaked into the test output.
const STUB_TOKEN = 'kc_e2e_stub_token_value';
const STUB_PREFIX = 'kc_e2e';

test.describe('Connect page (/connect)', () => {
    test('anonymous visitor sees the sign-in CTA', async ({ page }) => {
        await page.goto(`${BASE}/connect`);
        await expect(
            page.getByRole('heading', { name: /Connect kernelCAD to Claude Desktop/i }),
        ).toBeVisible();
        await expect(
            page.getByRole('button', { name: /Continue with Google/i }),
        ).toBeVisible();
    });

    test('renders snippet with placeholder before token is minted (stubbed auth)', async ({
        page,
    }) => {
        // Pre-seed a stub session into localStorage so useSession() resolves
        // to a signed-in state without going through Supabase. We also stub
        // the token API so the test does not hit the real backend.
        await page.addInitScript(() => {
            const storageKey = 'sb-stub-auth-token';
            // Minimal shape useSession()/getSession() reads. The supabase-js
            // client stores serialized session under sb-<project-ref>-auth-token
            // by default; tests that exercise the live auth path should use
            // signInWithPassword from inside the page context (see signed-in
            // test below). For this assertion we only need the route to
            // render the signed-in branch — but useSession reads from the
            // SDK directly, so we fall back to mocking the apiClient at the
            // network layer instead.
            (window as unknown as { __KCAD_E2E_STUB_AUTH__: string }).__KCAD_E2E_STUB_AUTH__ = storageKey;
        });

        // Intercept the token API.
        let tokenApiCalls = 0;
        await page.route(`${API_BASE}/api/v1/mcp/tokens`, async (route: Route) => {
            tokenApiCalls += 1;
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ token: STUB_TOKEN, tokenPrefix: STUB_PREFIX }),
            });
        });

        // Sign in via the supabase SDK from within the page context. Without
        // a real session we cannot exercise the signed-in branch — see the
        // skipped block below for the gated path.
        test.skip(
            !TEST_PASSWORD || !SUPABASE_URL || !SUPABASE_ANON,
            'KERNELCAD_E2E_TEST_PASSWORD / VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY not set — Slice 2 must provision the e2e-bot@kernelcad.com fixture before this branch can run. TODO(slice-2): unblock.',
        );

        await page.goto(`${BASE}/connect`);
        // Sign in via the SDK loaded by the app. We poll briefly because
        // the supabase client is lazy-instantiated.
        await page.evaluate(
            async ({ email, password }: { email: string; password: string }) => {
                // The app exposes the supabase client behind getSupabase(); we
                // re-import the same module the app uses so we share storage.
                const mod = await import('/src/funnel/lib/supabaseClient.ts');
                const supabase = mod.getSupabase();
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw new Error(error.message);
            },
            { email: TEST_EMAIL, password: TEST_PASSWORD ?? '' },
        );

        await page.reload();
        // Verify we landed on the signed-in branch.
        await expect(page.getByTestId('connect-generate-button')).toBeVisible();

        // 1. Snippet shows placeholder before the user clicks.
        const placeholderSnippet = await page.getByTestId('connect-snippet').textContent();
        expect(placeholderSnippet ?? '').toContain('<TOKEN>');
        expect(placeholderSnippet ?? '').not.toContain(STUB_TOKEN);

        // 2. Click generate → token API fires once.
        await page.getByTestId('connect-generate-button').click();
        await expect.poll(() => tokenApiCalls).toBe(1);

        // 3. Rendered snippet now contains the stub token.
        await expect(page.getByTestId('connect-snippet')).toContainText(STUB_TOKEN);
        await expect(page.getByTestId('connect-token-prefix')).toContainText(STUB_PREFIX);

        // 4. Copy button writes the snippet (incl. token) to the clipboard.
        await page.evaluate(() => {
            (window as unknown as { __copied: string }).__copied = '';
            Object.defineProperty(navigator, 'clipboard', {
                configurable: true,
                value: {
                    writeText: async (txt: string) => {
                        (window as unknown as { __copied: string }).__copied = txt;
                    },
                },
            });
        });
        await page.getByTestId('connect-copy-button').click();
        const copied = await page.evaluate(
            () => (window as unknown as { __copied: string }).__copied,
        );
        expect(copied).toContain(STUB_TOKEN);
        expect(copied).toContain('"mcpServers"');
        expect(copied).toContain('"kernelcad"');

        // 5. Three numbered steps render with platform-specific paths.
        await expect(page.getByTestId('connect-config-path')).toContainText(
            'Library/Application Support/Claude',
        );
        await page.getByTestId('connect-platform-windows').click();
        await expect(page.getByTestId('connect-config-path')).toContainText('%APPDATA%');
        await page.getByTestId('connect-platform-linux').click();
        await expect(page.getByTestId('connect-config-path')).toContainText('.config/Claude');

        // 6. Calling generate again issues a fresh token (rotation invariant).
        await page.getByTestId('connect-generate-button').click();
        await expect.poll(() => tokenApiCalls).toBe(2);
    });
});
