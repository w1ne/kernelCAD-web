import { test, expect } from '@playwright/test';

test('demo-player route renders without console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.goto('/demo-player');
  await page.waitForFunction(() => window.__demoPlayer !== undefined, { timeout: 10000 });
  await expect(page.locator('[data-testid="demo-player"]')).toBeVisible();

  // Expose handle and verify base API contract.
  const ready = await page.evaluate(() => window.__demoPlayer!.isFrameReady());
  expect(ready).toBe(true);

  // Verify loadFeatureMeshes API is present and returns expected shape.
  const fakeFace = {
    vertices: [0, 0, 0, 1, 0, 0, 0, 1, 0],
    indices: [0, 1, 2],
    normals: [0, 0, 1, 0, 0, 1, 0, 0, 1],
    faceId: 0,
  };
  const result = await page.evaluate(
    ({ feats, b }) => window.__demoPlayer!.loadFeatureMeshes(feats, b),
    {
      feats: [{ featureId: 'box_1', featureKind: 'box', predecessors: [], faces: [fakeFace] }],
      b: { min: [0, 0, 0] as [number, number, number], max: [1, 1, 1] as [number, number, number] },
    },
  );
  expect(result.groupCount).toBe(1);

  expect(errors).toEqual([]);
});

test('demo-player applies per-feature worldTransform to THREE.Group (B3 regression)', async ({ page }) => {
  // Regression for the borrow-integration B3 bug: when a script returns
  // arm.solvedModel({ shoulder: 90 }) (degrees), each part's FK transform is
  // serialized into FeatureMesh.transform and MUST be applied to the THREE
  // group at construction. Before this fix, the matrix was rehydrated but
  // never applied, so the headless render path showed every assembly at its
  // rest pose regardless of solvedModel() args.
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.goto('/demo-player');
  await page.waitForFunction(() => window.__demoPlayer !== undefined, { timeout: 10000 });

  const fakeFace = {
    vertices: [0, 0, 0, 1, 0, 0, 0, 1, 0],
    indices: [0, 1, 2],
    normals: [0, 0, 1, 0, 0, 1, 0, 0, 1],
    faceId: 0,
  };
  // Translate-only column-major mat4: T(7, 0, 0). The matrix is row-major
  // when read as [m00,m01,m02,m03, m10,m11,...]; THREE.Matrix4.fromArray
  // expects column-major, so for translation x=7 the array is:
  //   col0:[1,0,0,0]  col1:[0,1,0,0]  col2:[0,0,1,0]  col3:[7,0,0,1]
  const translateXSeven = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 7, 0, 0, 1];
  await page.evaluate(
    ({ feats, b }) => window.__demoPlayer!.loadFeatureMeshes(feats, b),
    {
      feats: [
        {
          featureId: 'posed_part',
          featureKind: 'assemblyPart',
          predecessors: [],
          faces: [fakeFace],
          transform: translateXSeven,
        },
      ],
      b: { min: [0, 0, 0] as [number, number, number], max: [10, 1, 1] as [number, number, number] },
    },
  );

  // After loadFeatureMeshes returns, the KCAD group should have its matrix
  // populated with the supplied translation (composed with the centroid
  // recenter, but the X column should still record the translation magnitude).
  const m = await page.evaluate(() => {
    const groups = window.__demoPlayer!.dumpScene().kcadGroupMatrices;
    return groups[0];
  });
  expect(m).toBeDefined();
  // Element 12 is the column-major x-translation. With centroid recenter for
  // bounds [0,10] × [0,1] × [0,1], cx = 5, so the composed translation x is
  // (7 - 5) = 2. The exact value is less important than non-zero — a missing
  // transform would leave m[12] = -5 (just the centroid). Be lenient on the
  // exact value but assert direction:
  expect(typeof m[12]).toBe('number');
  expect(m[12]).toBeGreaterThan(0); // worldTransform translate moved the group +X past the centroid

  expect(errors).toEqual([]);
});

test('demo-player can load the robot arm example through the dev mesh endpoint', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.goto('/demo-player?script=examples/robot-arm/desktop-3axis-mates.kcad.ts');
  await page.waitForFunction(() => window.__demoPlayer !== undefined, { timeout: 10000 });
  await page.waitForFunction(() => window.__demoPlayer!.dumpScene().meshCount > 20, { timeout: 30000 });

  const dump = await page.evaluate(() => window.__demoPlayer!.dumpScene());
  expect(dump.meshCount).toBeGreaterThan(20);
  expect(dump.sampleOpacities.every((opacity) => opacity === 1)).toBe(true);
  expect(errors).toEqual([]);
});
