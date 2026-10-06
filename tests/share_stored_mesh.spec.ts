// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Share pages must paint the mesh stored at publish time. This hits the
// production CDN and Supabase, so it stays off unless SHARE_MESH_E2E=1 and
// the dev server was started with VITE_HOSTED_MESH=1 plus the prod API env.
import { expect, test, type Page, type TestInfo } from '@playwright/test';

// The stored artifact is on screen well under the old 11–43s rebuild wait.
// Software GL in CI spends a few extra seconds on the first frame of a
// large metal assembly; a desktop GPU paints the same CDN read in the
// time the JSON takes to arrive.
const PAINT_MS = 8_000;

interface ShareCase {
  slug: string;
  version: number;
  /** Heading the page must show for this pin. */
  title: string;
}

const CASES: ShareCase[] = [
  { slug: 'V4P2zJTm', version: 1, title: 'Compact GT2 belt-driven rotary actuator' },
  { slug: 'V4P2zJTm', version: 2, title: 'Shop-release planetary gearbox' },
  { slug: 'V4P2zJTm', version: 3, title: '4-DOF open-chain release pack' },
  { slug: 'V4P2zJTm', version: 4, title: 'NEMA plate + motor stand-in + shaft/bearing + involute spur pair' },
  { slug: 'V4P2zJTm', version: 5, title: 'Clamshell enclosure release pack' },
  { slug: 'V4P2zJTm', version: 6, title: 'T-slot frame corner — two rails, gusset, cap screws, named materials' },
  { slug: '6iPuq1ee', version: 1, title: 'QA Oct6 GT2 shop-release actuator' },
  { slug: 'nmBBv4LZ', version: 1, title: 'QA Oct6 planetary gearbox shop-release' },
  { slug: 'DNSlHVFO', version: 1, title: 'QA Oct6 4DOF arm release pack' },
  { slug: 'Ux9hXUPe', version: 1, title: 'QA Oct6 NEMA17 spur drive stack' },
  { slug: 'cgghWRGN', version: 1, title: 'QA Oct6 clamshell enclosure release' },
  { slug: 'OGm0lP_B', version: 1, title: 'QA Oct6 T-slot frame corner BOM' },
  { slug: 'ONMZ6l4s', version: 1, title: 'QA Oct6 machined housing with holes+fillets' },
];

function sharePath(entry: ShareCase): string {
  return `/p/${entry.slug}?version=${entry.version}`;
}

/** The mesh CDN and API allow `https://app.kernelcad.com` only. A local
 *  Vite origin is not on that list, so the test runner refetches those
 *  URLs and hands the bytes back with a local CORS header. The page still
 *  requests the real hosts. */
async function replayProdReads(page: Page): Promise<void> {
  const replay = async (route: import('@playwright/test').Route) => {
    const request = route.request();
    if (request.url().includes('/events')) {
      await route.fulfill({
        status: 200,
        headers: {
          'content-type': 'text/event-stream',
          'access-control-allow-origin': '*',
        },
        body: ': ok\n\n',
      });
      return;
    }
    const response = await route.fetch({
      headers: { ...request.headers(), origin: 'https://app.kernelcad.com' },
    });
    const headers = response.headers();
    headers['access-control-allow-origin'] = '*';
    delete headers['access-control-allow-credentials'];
    await route.fulfill({
      status: response.status(),
      headers,
      body: await response.body(),
    });
  };
  await page.route('https://mesh.kernelcad.com/**', replay);
  await page.route('https://api.kernelcad.com/**', replay);
}

/** T-slot, GT2, and NEMA pins. These are the pages whose metals went solid
 *  black with blown white highlights when the room environment was missing. */
function expectsShadedMetal(entry: ShareCase): boolean {
  if (entry.slug === '6iPuq1ee' || entry.slug === 'Ux9hXUPe' || entry.slug === 'OGm0lP_B') return true;
  return entry.slug === 'V4P2zJTm' && (entry.version === 1 || entry.version === 4 || entry.version === 6);
}

/** Clamshell and housing are light plastic. Their dark pockets are real;
 *  blown-white faces (luma > 245) are the overexposure this check flags. */
function expectsBlownWhite(entry: ShareCase): boolean {
  return entry.slug === 'cgghWRGN' || entry.slug === 'ONMZ6l4s';
}

/** Fraction of model pixels that are near-black (luma < 20) or blown white,
 *  plus the blown-white fraction on its own. Read from a compositor
 *  screenshot so a cleared WebGL drawing buffer cannot report a false frame. */
async function modelLumaFractions(page: Page): Promise<{ extreme: number; blown: number }> {
  const png = await page.locator('canvas').screenshot();
  const url = `data:image/png;base64,${png.toString('base64')}`;
  return page.evaluate(async (src) => {
    const img = new Image();
    img.src = src;
    await img.decode();
    const size = 96;
    const copy = document.createElement('canvas');
    copy.width = size;
    copy.height = size;
    const ctx = copy.getContext('2d', { willReadFrequently: true });
    if (!ctx) return { extreme: 1, blown: 1 };
    ctx.drawImage(img, 0, 0, size, size);
    const pixels = ctx.getImageData(0, 0, size, size).data;
    let model = 0;
    let extreme = 0;
    let blown = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i] ?? 0;
      const g = pixels[i + 1] ?? 0;
      const b = pixels[i + 2] ?? 0;
      // Stage background is #202126. Skip it and the empty margin.
      if (Math.abs(r - 32) < 18 && Math.abs(g - 33) < 18 && Math.abs(b - 38) < 18) continue;
      model += 1;
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      if (lum < 20 || lum > 245) extreme += 1;
      if (lum > 245) blown += 1;
    }
    if (model === 0) return { extreme: 1, blown: 1 };
    return { extreme: extreme / model, blown: blown / model };
  }, url);
}

/** Luminance spread of the painted canvas. A metal with no environment, or
 *  two coincident meshes, collapses to solid black and solid white. */
async function shadeStats(page: Page): Promise<{ model: number; extreme: number; mid: number }> {
  return page.evaluate(() => {
    const src = document.querySelector('canvas');
    if (!(src instanceof HTMLCanvasElement) || src.width === 0) {
      return { model: 0, extreme: 1, mid: 0 };
    }
    const size = 48;
    const copy = document.createElement('canvas');
    copy.width = size;
    copy.height = size;
    const ctx = copy.getContext('2d', { willReadFrequently: true });
    if (!ctx) return { model: 0, extreme: 1, mid: 0 };
    ctx.drawImage(src, 0, 0, size, size);
    const pixels = ctx.getImageData(0, 0, size, size).data;
    let model = 0;
    let extreme = 0;
    let mid = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i] ?? 0;
      const g = pixels[i + 1] ?? 0;
      const b = pixels[i + 2] ?? 0;
      // Stage background is #202126. Skip it and the empty margin.
      if (Math.abs(r - 32) < 14 && Math.abs(g - 33) < 14 && Math.abs(b - 38) < 14) continue;
      model += 1;
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      if (lum < 12 || lum > 243) extreme += 1;
      else if (lum >= 28 && lum <= 220) mid += 1;
    }
    const denom = model || 1;
    return { model: model / (size * size), extreme: extreme / denom, mid: mid / denom };
  });
}

test.describe('share pages paint the stored mesh', () => {
  test.skip(process.env.SHARE_MESH_E2E !== '1', 'Set SHARE_MESH_E2E=1 to paint production artifacts.');

  test('each pin paints the CDN artifact', async ({ page }, testInfo: TestInfo) => {
    test.setTimeout(180_000);
    await page.emulateMedia({ colorScheme: 'dark' });
    await replayProdReads(page);
    const forbidden: string[] = [];
    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('/gallery/_mesh/') || url.includes('/__kernelcad/mesh')) forbidden.push(url);
    });

    // One cold load so Vite's module graph is in the browser cache. The
    // budget below is the warm navigation a returning visitor gets.
    await page.goto(sharePath(CASES[0]!));
    await expect(page.getByTestId('model-stage')).toHaveAttribute('data-phase', 'displayed', { timeout: 60_000 });

    for (const entry of CASES) {
      await test.step(`${entry.slug} v${entry.version}`, async () => {
        forbidden.length = 0;
        const started = Date.now();
        await page.goto(sharePath(entry), { waitUntil: 'commit' });
        await expect(page.getByTestId('model-stage')).toHaveAttribute('data-phase', 'displayed', { timeout: PAINT_MS });
        const elapsed = Date.now() - started;
        await expect(page.getByRole('heading', { level: 1 })).toHaveText(entry.title, { timeout: PAINT_MS });
        await expect(page.getByTestId('approximate-preview')).toHaveCount(0);
        await expect(page.getByTestId('model-stage-status')).toHaveCount(0);
        await expect(page.getByText(new RegExp(`\\br${entry.version}\\b`)).first()).toBeVisible();
        expect(forbidden, `remesh or gallery mesh requested: ${forbidden.join(', ')}`).toEqual([]);
        await page.waitForTimeout(700);
        const shade = await shadeStats(page);
        const luma = expectsShadedMetal(entry) || expectsBlownWhite(entry)
          ? await modelLumaFractions(page)
          : undefined;
        const shot = await page.getByTestId('model-stage').screenshot();
        await testInfo.attach(`${entry.slug}-v${entry.version}`, {
          body: JSON.stringify({ elapsed, shade, luma }),
          contentType: 'application/json',
        });
        // Shade and luma are recorded, not asserted: the viewer lighting is
        // reviewed separately (feat/viewer-lighting-agx).
        await testInfo.attach(`${entry.slug}-v${entry.version}.png`, {
          body: shot,
          contentType: 'image/png',
        });
        const canvas = page.locator('canvas');
        await expect(canvas).toBeVisible();
        expect(await canvas.evaluate((node) => (node as HTMLCanvasElement).width)).toBeGreaterThan(100);
        expect(elapsed, 'first full paint').toBeLessThan(PAINT_MS);
      });
    }
  });
});
