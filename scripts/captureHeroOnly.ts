// scripts/captureHeroOnly.ts
//
// Fast hero-only capture for tight iteration loops on the pocket-watch demo.
// Renders ONLY the iso hero frame at 1920×1080 (matching the demo-player's
// headless ViewerPane size, so the model is properly centered in screenshot),
// skipping the ~120-frame rotate video that takes 30+ minutes at full res.
//
// Use when iterating on geometry/proportions — captureRotateOnly only after
// the look has converged.
import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { loadScriptFeatures } from './lib/scriptLoader';
import { meshFeaturesPerFeature } from '../src/modeling/capture/featureMeshing';
import { serializeForBridge } from '../src/modeling/capture/featureMeshSerialize';

// Optional CLI arg: path to a build.kcad.ts script. When provided, the hero
// PNG is written next to the script (replacing the file's basename suffix
// with `hero-frame.png`). Default targets the v0.7 pocket-watch demo.
const CLI_SCRIPT = process.argv[2];
const SCRIPT_PATH = CLI_SCRIPT ? resolve(CLI_SCRIPT) : resolve('examples/portfolio/pocket-watch/build.kcad.ts');
const HERO_PNG = CLI_SCRIPT
  ? resolve(CLI_SCRIPT, '..', 'hero-frame.png')
  : resolve('docs/demos/v0.7/pocket-watch/hero-frame.png');
const W = 1920;
const H = 1080;

interface DemoWindow {
  loadFeatureMeshes: (perFeature: unknown, bounds: unknown) => unknown;
  forceFullOpacity: () => void;
  showOnlyTailFeatures: () => void;
  setVersion: (v: string) => void;
  advance: (ms: number) => void;
  onEvent: (e: unknown) => void;
  setRenderView: (v: string) => void;
}
declare const window: { __demoPlayer?: DemoWindow };

async function main(): Promise<void> {
  console.log(`Loading features from ${SCRIPT_PATH}...`);
  const loaded = await loadScriptFeatures(SCRIPT_PATH);
  const meshing = await meshFeaturesPerFeature(
    loaded.features.map((f) => f.record),
    loaded.paramTable,
    loaded.session,
  );
  if (meshing.failedFeatureIds.length > 0) {
    throw new Error(`feature failures: ${meshing.failedFeatureIds.join(',')}`);
  }
  const serialized = meshing.features.map(serializeForBridge);
  console.log(`Meshed ${serialized.length} features.`);

  const browser = await chromium.launch({ args: ['--disable-dev-shm-usage'] });
  try {
    const ctx = await browser.newContext({ viewport: { width: W, height: H } });
    const page = await ctx.newPage();
    page.setDefaultTimeout(180000);
    const port = process.env.VITE_PORT ?? '5173';
    await page.goto(`http://127.0.0.1:${port}/demo-player?headless=1`);
    await page.waitForFunction(() => window.__demoPlayer !== undefined, { timeout: 30000 });
    await page.evaluate(() => window.__demoPlayer!.setVersion('v0.7'));

    await page.evaluate(({ feats, b }: { feats: unknown; b: unknown }) => window.__demoPlayer!.loadFeatureMeshes(feats, b), { feats: serialized, b: meshing.bounds });

    for (const fm of meshing.features) {
      await page.evaluate((e: unknown) => window.__demoPlayer!.onEvent(e), {
        kind: 'feature.compiled',
        featureId: fm.featureId,
        featureKind: fm.featureKind,
        predecessors: fm.predecessors,
        diagnostics: [],
        health: 'healthy',
        shape: null,
        op: fm.op,
      });
    }
    await page.evaluate(() => window.__demoPlayer!.advance(2000));
    await page.evaluate(() => window.__demoPlayer!.forceFullOpacity());
    await page.evaluate(() => window.__demoPlayer!.showOnlyTailFeatures());

    console.log('Capturing hero frame at iso pose...');
    await page.evaluate(() => window.__demoPlayer!.setRenderView('iso'));
    await page.screenshot({ path: HERO_PNG, type: 'png' });
    console.log(`Wrote ${HERO_PNG}`);
  } finally {
    await browser.close().catch(() => undefined);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
