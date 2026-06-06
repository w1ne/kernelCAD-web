import { test, expect } from '@playwright/test';
import sharp from 'sharp';
import { normalizeInspectionTileForTest } from './../src/agent/render/headlessRender';

test.use({ viewport: { width: 1920, height: 1080 } });

/** 12-triangle cuboid FeatureMesh face, centered at origin. */
function boxFace(w: number, d: number, h: number) {
  const x = w / 2, y = d / 2, z = h / 2;
  const c = [
    [-x, -y, -z], [x, -y, -z], [x, y, -z], [-x, y, -z],
    [-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z],
  ];
  const quads: [number, number, number, number, number[]][] = [
    [0, 1, 5, 4, [0, -1, 0]], [2, 3, 7, 6, [0, 1, 0]], [1, 2, 6, 5, [1, 0, 0]],
    [3, 0, 4, 7, [-1, 0, 0]], [4, 5, 6, 7, [0, 0, 1]], [3, 2, 1, 0, [0, 0, -1]],
  ];
  const vertices: number[] = [], normals: number[] = [], indices: number[] = [];
  for (const [a, b, cc, dd, n] of quads) {
    const base = vertices.length / 3;
    for (const ci of [a, b, cc, dd]) { vertices.push(...c[ci]); normals.push(...n); }
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  return { vertices, indices, normals, faceId: 0 };
}

async function maskBBox(png: Buffer) {
  const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
  let minX = Infinity, minY = Infinity, maxX = -1, maxY = -1;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    const i = (y * info.width + x) * info.channels;
    if (data[i] !== 0 || data[i + 1] !== 0 || data[i + 2] !== 0) {
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
  }
  return { minX, minY, maxX, maxY, width: info.width, height: info.height };
}

async function loadTallBox(page: import('@playwright/test').Page) {
  await page.goto('/demo-player?headless=1');
  await page.waitForFunction(() => window.__demoPlayer !== undefined, { timeout: 15000 });
  await page.evaluate(({ face }) => {
    window.__demoPlayer!.loadFeatureMeshes(
      [{ featureId: 'box_1', featureKind: 'box', predecessors: [], faces: [face] }],
      { min: [-15, -5, -50], max: [15, 5, 50] },
    );
    window.__demoPlayer!.forceFullOpacity();
    window.__demoPlayer!.showOnlyTailFeatures();
  }, { face: boxFace(30, 10, 100) });
}

test('square inspect tile: mask clears the frame and fills ≥70% of the long axis', async ({ page }) => {
  await loadTallBox(page);
  await page.evaluate(() => window.__demoPlayer!.setRenderView('front', 1));
  const cap = await page.evaluate(() => window.__demoPlayer!.captureMaskPng());
  const raw = Buffer.from(cap.pngDataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');
  const tile = await normalizeInspectionTileForTest(raw, {
    viewportWidth: 1024, viewportHeight: 1024, channel: 'mask',
  });
  const bb = await maskBBox(tile);
  expect(bb.minX).toBeGreaterThan(0);
  expect(bb.minY).toBeGreaterThan(0);
  expect(bb.maxX).toBeLessThan(bb.width - 1);
  expect(bb.maxY).toBeLessThan(bb.height - 1);
  const longAxis = Math.max(bb.maxX - bb.minX + 1, bb.maxY - bb.minY + 1);
  expect(longAxis).toBeGreaterThanOrEqual(0.70 * Math.max(bb.width, bb.height));
});

test('native-aspect view: mask does not clip at the frame edge', async ({ page }) => {
  await loadTallBox(page);
  await page.evaluate(() => window.__demoPlayer!.setRenderView('front'));
  const cap = await page.evaluate(() => window.__demoPlayer!.captureMaskPng());
  const raw = Buffer.from(cap.pngDataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');
  const bb = await maskBBox(raw);
  expect(bb.minX).toBeGreaterThan(0);
  expect(bb.minY).toBeGreaterThan(0);
  expect(bb.maxX).toBeLessThan(bb.width - 1);
  expect(bb.maxY).toBeLessThan(bb.height - 1);
});
