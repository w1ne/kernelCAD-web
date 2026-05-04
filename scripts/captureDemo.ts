#!/usr/bin/env node
// scripts/captureDemo.ts
import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, join, basename, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import { chromium, type Browser, type Page } from 'playwright';
import { loadScriptFeatures } from './lib/scriptLoader';
import { computeTimeline, type PacingOverride } from './lib/pacingEngine';
import { FfmpegPipeline } from './lib/ffmpegPipeline';
import { composeStaticPanel } from './lib/staticPanel';
import { whatsNewTemplate, writeWhatsNewIfMissing } from './lib/whatsNewTemplate';
import { meshFeaturesPerFeature } from '../src/capture/featureMeshing';
import { serializeForBridge } from '../src/capture/featureMeshSerialize';

interface Args {
  task?: string;
  script?: string;
  prompt?: string;
  module: string;
  output: string;
  pacing?: string;
  titleCardSvg?: string;
  rotateOnly: boolean;
  heroArtifact: string;
  overrideApprovedBy: string | null;
}

function parseArgs(argv: string[]): Args {
  const a: Partial<Args> = { rotateOnly: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === '--task') { a.task = next; i++; }
    else if (arg === '--script') { a.script = next; i++; }
    else if (arg === '--prompt') { a.prompt = next; i++; }
    else if (arg === '--module') { a.module = next; i++; }
    else if (arg === '--output') { a.output = next; i++; }
    else if (arg === '--pacing') { a.pacing = next; i++; }
    else if (arg === '--title-card-svg') { a.titleCardSvg = next; i++; }
    else if (arg === '--rotate-only') { a.rotateOnly = true; }
    else if (arg === '--hero-artifact') { a.heroArtifact = next; i++; }
    else if (arg === '--override-approved-by') { a.overrideApprovedBy = next; i++; }
  }
  if (!a.module || !a.output) {
    console.error('Usage: captureDemo --module v0.X --output <dir> --hero-artifact <slug> (--task <id> | --script <path> --prompt <path>) [--override-approved-by "<name>: <reason>"]');
    process.exit(2);
  }
  if (!a.task && !(a.script && a.prompt)) {
    console.error('Must specify either --task or both --script and --prompt');
    process.exit(2);
  }
  if (!a.heroArtifact && !a.rotateOnly) {
    console.error('Missing --hero-artifact <slug>. See docs/superpowers/specs/2026-05-04-memorable-builds-policy-design.md §2 for the catalog.');
    process.exit(2);
  }
  // rotate-only re-renders cached output and never writes meta.json or whats-new.md;
  // a slug isn't required for that path.
  if (!a.heroArtifact) a.heroArtifact = '';
  if (!a.overrideApprovedBy) a.overrideApprovedBy = null;
  return a as Args;
}

async function ensureViteRunning(): Promise<{ stop: () => void }> {
  // Try to reach existing dev server first.
  try {
    const res = await fetch('http://127.0.0.1:5173/');
    if (res.ok) return { stop: () => {} };
  } catch { /* not running, will start */ }
  const { spawn } = await import('node:child_process');
  const proc = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', '5173'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false,
  });
  // Wait for ready signal.
  await new Promise<void>((resolveReady, rejectReady) => {
    const t = setTimeout(() => rejectReady(new Error('vite did not start within 30s')), 30000);
    proc.stdout.on('data', (d: Buffer) => {
      if (d.toString().includes('Local:')) {
        clearTimeout(t);
        resolveReady();
      }
    });
  });
  return { stop: () => proc.kill('SIGTERM') };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  console.log(`captureDemo: module=${args.module}, output=${args.output}`);
  mkdirSync(args.output, { recursive: true });

  const vite = await ensureViteRunning();
  const browser: Browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page: Page = await context.newPage();
  await page.goto('http://127.0.0.1:5173/demo-player');
  await page.waitForFunction(() => window.__demoPlayer !== undefined, { timeout: 15000 });
  await page.evaluate((v) => window.__demoPlayer!.setVersion(v), args.module);

  console.log('demo-player ready');

  if (args.rotateOnly) {
    const existingPacing = JSON.parse(readFileSync(join(args.output, 'pacing.json'), 'utf8'));
    // Mesh scene Node-side and ship to browser — same path as the main capture.
    let scriptPath2: string;
    if (args.task) {
      const runsBase = resolve(__dirname, '../eval/runs');
      const runDirs = readdirSync(runsBase).sort();
      const latest = runDirs[runDirs.length - 1];
      scriptPath2 = join(runsBase, latest, args.task, 'output.kcad.ts');
    } else {
      scriptPath2 = resolve(args.script!);
    }
    const loaded2 = await loadScriptFeatures(scriptPath2);
    const { features: featureMeshes2, bounds: bounds2, failedFeatureIds: failedIds2 } =
      await meshFeaturesPerFeature(loaded2.features.map((f) => f.record));
    if (failedIds2.length > 0) {
      console.error(`captureDemo: ${failedIds2.length} feature(s) failed to compile: ${failedIds2.join(', ')}`);
      console.error('Aborting capture — partial scene would produce a broken demo.');
      process.exit(1);
    }
    const serialized2 = featureMeshes2.map(serializeForBridge);
    await page.evaluate(
      ({ feats, b }) => window.__demoPlayer!.loadFeatureMeshes(feats, b),
      { feats: serialized2, b: bounds2 },
    );
    console.log(`rotate-only: loaded ${serialized2.length} feature groups`);

    // Replay all events instantly to drive AnimationEngine to its settled state.
    // Without this, groups are loaded at opacity 0 and the rotate phase shows a black scene.
    for (const fm of featureMeshes2) {
      await page.evaluate(
        (e) => window.__demoPlayer!.onEvent(e),
        {
          kind: 'feature.compiled',
          featureId: fm.featureId,
          featureKind: fm.featureKind,
          predecessors: fm.predecessors,
          diagnostics: [],
          health: 'healthy',
          shape: null,
          op: fm.op,
        } as never,
      );
    }
    // One large advance to settle all in-flight tweens (max anim duration is 600ms).
    await page.evaluate((dt: number) => window.__demoPlayer!.advance(dt), 2000);

    const ffmpeg = new FfmpegPipeline();
    const mp4Path = join(args.output, 'demo.mp4');
    ffmpeg.start({ outputPath: mp4Path, fps: 30, width: 1920, height: 1080 });
    await page.evaluate((d) => window.__demoPlayer!.setRotatePhase(d), existingPacing.rotateDurationMs);
    const frameMs = 1000 / 30;
    const rotateFrames = Math.floor(existingPacing.rotateDurationMs / frameMs);
    for (let i = 0; i < rotateFrames; i++) {
      await page.evaluate((dtMs: number) => window.__demoPlayer!.advance(dtMs), frameMs);
      const buf = await page.screenshot({ type: 'png' });
      await ffmpeg.pushFrame(buf);
    }
    await ffmpeg.finalize();
    await browser.close();
    vite.stop();
    return;
  }

  // Resolve script path + prompt + score.
  let scriptPath: string;
  let promptText: string;
  let scoreSummary = { passed: true, value: 1.0, criteria: ['demo-replay-only'] };
  if (args.task) {
    // Find latest run dir.
    const runsBase = resolve(__dirname, '../eval/runs');
    const runDirs = readdirSync(runsBase).sort();
    const latest = runDirs[runDirs.length - 1];
    const taskDir = join(runsBase, latest, args.task);
    scriptPath = join(taskDir, 'output.kcad.ts');
    promptText = readFileSync(resolve(__dirname, `../eval/tasks/${args.task}/prompt.md`), 'utf8');
    if (existsSync(join(taskDir, 'score.json'))) {
      const s = JSON.parse(readFileSync(join(taskDir, 'score.json'), 'utf8'));
      scoreSummary = {
        passed: !!s.passed,
        value: s.value ?? 0,
        criteria: Object.keys(s.criteria ?? {}),
      };
    }
  } else {
    scriptPath = resolve(args.script!);
    promptText = readFileSync(resolve(args.prompt!), 'utf8');
  }

  const loaded = await loadScriptFeatures(scriptPath);
  const override: PacingOverride = args.pacing
    ? JSON.parse(readFileSync(resolve(args.pacing), 'utf8'))
    : {};
  const pacing = computeTimeline(
    loaded.features.map((f) => ({ id: f.id, kind: f.kind })),
    override,
  );
  console.log(`pacing: total=${pacing.totalDurationMs}ms preRoll=${pacing.preRollMs}ms rotate=${pacing.rotateDurationMs}ms truncated=${pacing.truncated}`);

  // Node-side per-feature meshing: builds the scene authoritative source of truth.
  const { features: featureMeshes, bounds, failedFeatureIds } = await meshFeaturesPerFeature(
    loaded.features.map((f) => f.record),
  );
  if (failedFeatureIds.length > 0) {
    console.error(`captureDemo: ${failedFeatureIds.length} feature(s) failed to compile: ${failedFeatureIds.join(', ')}`);
    console.error('Aborting capture — partial scene would produce a broken demo.');
    process.exit(1);
  }
  const serialized = featureMeshes.map(serializeForBridge);
  await page.evaluate(
    ({ feats, b }) => window.__demoPlayer!.loadFeatureMeshes(feats, b),
    { feats: serialized, b: bounds },
  );
  console.log(`loaded ${serialized.length} feature groups, bounds=[${bounds.min.map(v => v.toFixed(1)).join(',')}]→[${bounds.max.map(v => v.toFixed(1)).join(',')}]`);

  // Drive terminal lines (statements as a rough proxy — split source by newline).
  const sourceLines = loaded.source.split('\n').filter((l) => l.trim().length > 0);
  const terminalLines = loaded.features.map((f, i) => {
    const t = pacing.features.get(f.id)!;
    return { text: sourceLines[i] ?? `// ${f.id}`, fullyTypedAtMs: pacing.preRollMs + t.startAtMs };
  });
  await page.evaluate((lines) => window.__demoPlayer!.setTerminalLines(lines), terminalLines);
  await page.evaluate((origin) => window.__demoPlayer!.startTerminalClock(origin), pacing.preRollMs);

  // Title card if needed.
  if (pacing.preRollMs > 0) {
    await page.evaluate(
      (spec) => window.__demoPlayer!.setTitleCard(spec),
      { title: `${args.module} — ${args.task ?? basename(scriptPath, '.kcad.ts')}`, tagline: 'synchronized live-build demo', durationMs: pacing.preRollMs },
    );
  }

  const ffmpeg = new FfmpegPipeline();
  const mp4Path = join(args.output, 'demo.mp4');
  ffmpeg.start({ outputPath: mp4Path, fps: 30, width: 1920, height: 1080 });

  const frameMs = 1000 / 30;
  const startWall = Date.now();
  const advance = async (toMs: number): Promise<void> => {
    const dt = toMs - (Date.now() - startWall);
    if (dt > 0) await new Promise((r) => setTimeout(r, dt));
    await page.evaluate((dtMs: number) => window.__demoPlayer!.advance(dtMs), frameMs);
  };

  const meshById = new Map(featureMeshes.map((m) => [m.featureId, m]));
  const sortedEvents = loaded.features
    .map((f) => {
      const mesh = meshById.get(f.id);
      if (!mesh) {
        throw new Error(`captureDemo: feature '${f.id}' has no mesh — likely a meshFeaturesPerFeature bug`);
      }
      return { feature: f, t: pacing.features.get(f.id)!, mesh };
    })
    .sort((a, b) => a.t.startAtMs - b.t.startAtMs);
  let nextEventIdx = 0;

  for (let frameIdx = 0; frameIdx * frameMs <= pacing.totalDurationMs - pacing.rotateDurationMs; frameIdx++) {
    const elapsedMs = frameIdx * frameMs;
    // Clear title card after preRoll.
    if (pacing.preRollMs > 0 && elapsedMs >= pacing.preRollMs && elapsedMs < pacing.preRollMs + frameMs) {
      await page.evaluate(() => window.__demoPlayer!.setTitleCard(null));
    }
    // Emit any due events.
    while (nextEventIdx < sortedEvents.length && pacing.preRollMs + sortedEvents[nextEventIdx].t.startAtMs <= elapsedMs) {
      const item = sortedEvents[nextEventIdx];
      await page.evaluate(
        (e) => window.__demoPlayer!.onEvent(e),
        {
          kind: 'feature.compiled',
          featureId: item.feature.id,
          featureKind: item.feature.kind,
          predecessors: item.mesh.predecessors,
          diagnostics: [],
          health: 'healthy',
          shape: null,
          op: item.mesh.op,
        } as never,
      );
      nextEventIdx++;
    }
    await advance(elapsedMs);
    const buf = await page.screenshot({ type: 'png' });
    await ffmpeg.pushFrame(buf);
  }

  // Rotate phase.
  await page.evaluate((d) => window.__demoPlayer!.setRotatePhase(d), pacing.rotateDurationMs);
  const rotateFrames = Math.floor(pacing.rotateDurationMs / frameMs);
  for (let i = 0; i < rotateFrames; i++) {
    await page.evaluate((dtMs: number) => window.__demoPlayer!.advance(dtMs), frameMs);
    const buf = await page.screenshot({ type: 'png' });
    await ffmpeg.pushFrame(buf);
  }

  // Hero frame.
  const heroPath = join(args.output, 'hero-frame.png');
  await page.screenshot({ path: heroPath, type: 'png' });

  await ffmpeg.finalize();
  console.log(`mp4 written: ${mp4Path}`);

  // Static panel.
  const heroBuf = readFileSync(heroPath);
  await composeStaticPanel({
    promptText,
    scriptSource: loaded.source,
    heroFramePngBuffer: heroBuf,
    score: scoreSummary,
    outputPath: join(args.output, 'panel.png'),
  });

  // whats-new.md (only if missing).
  const partName = args.task ?? basename(scriptPath, '.kcad.ts');
  writeWhatsNewIfMissing(
    join(args.output, 'whats-new.md'),
    whatsNewTemplate({ module: args.module, partName, heroArtifact: args.heroArtifact }),
  );

  // Metadata.
  writeFileSync(
    join(args.output, 'meta.json'),
    JSON.stringify({
      taskId: args.task ?? basename(scriptPath),
      module: args.module,
      capturedAt: new Date().toISOString(),
      durationMs: pacing.totalDurationMs,
      truncated: pacing.truncated,
      gitSha: execSync('git rev-parse HEAD').toString().trim(),
      heroArtifact: args.heroArtifact,
      catalogSource: `memorable-builds-policy/${args.module}`,
      overrideApprovedBy: args.overrideApprovedBy,
    }, null, 2),
  );
  writeFileSync(
    join(args.output, 'pacing.json'),
    JSON.stringify({
      preRollMs: pacing.preRollMs,
      rotateStartMs: pacing.rotateStartMs,
      rotateDurationMs: pacing.rotateDurationMs,
      totalDurationMs: pacing.totalDurationMs,
      features: Object.fromEntries(pacing.features),
    }, null, 2),
  );

  await browser.close();
  vite.stop();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
