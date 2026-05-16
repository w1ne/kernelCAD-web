#!/usr/bin/env node
// scripts/capturePortfolioEntry.ts
//
// Wrap captureDemo for a portfolio entry: produces build.mp4, build.step,
// build.stl, meta.json under examples/portfolio/<slug>/.
//
// Usage:
//   npx tsx scripts/capturePortfolioEntry.ts \
//     --slug stepper-motor-bracket \
//     --script examples/portfolio/stepper-motor-bracket/build.kcad.ts \
//     --prompt examples/portfolio/stepper-motor-bracket/_prompt.md \
//     --source-url https://github.com/example/repo/issues/42 \
//     --source-license MIT \
//     --paraphrased-prompt "Mounting bracket for a NEMA 17 stepper..." \
//     --model claude-opus-4-7 \
//     --attempt-count 1 \
//     --category bracket \
//     --difficulty easy
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { writePortfolioMeta, type PortfolioCategory, type PortfolioDifficulty, type PortfolioMeta } from './lib/portfolioMeta';
import { loadScriptFeatures } from './lib/scriptLoader';
import { meshFeaturesPerFeature } from '../src/capture/featureMeshing';
import { encodeBinaryStl } from '../src/kernel/backends/occt/exportStlBinary';

interface Args {
  slug: string;
  script: string;
  prompt: string;
  sourceUrl: string;
  sourceLicense: string;
  paraphrasedPrompt: string;
  model: string;
  attemptCount: number;
  category: PortfolioCategory;
  difficulty: PortfolioDifficulty;
}

function parseArgs(argv: string[]): Args {
  const a: Partial<Args> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === '--slug') { a.slug = next; i++; }
    else if (arg === '--script') { a.script = next; i++; }
    else if (arg === '--prompt') { a.prompt = next; i++; }
    else if (arg === '--source-url') { a.sourceUrl = next; i++; }
    else if (arg === '--source-license') { a.sourceLicense = next; i++; }
    else if (arg === '--paraphrased-prompt') { a.paraphrasedPrompt = next; i++; }
    else if (arg === '--model') { a.model = next; i++; }
    else if (arg === '--attempt-count') { a.attemptCount = Number(next); i++; }
    else if (arg === '--category') { a.category = next as PortfolioCategory; i++; }
    else if (arg === '--difficulty') { a.difficulty = next as PortfolioDifficulty; i++; }
  }
  for (const k of ['slug','script','prompt','sourceUrl','sourceLicense','paraphrasedPrompt','model','attemptCount','category','difficulty'] as const) {
    if (a[k] === undefined) {
      console.error(`capturePortfolioEntry: missing --${k.replace(/[A-Z]/g, m => '-' + m.toLowerCase())}`);
      process.exit(2);
    }
  }
  return a as Args;
}

function sha256(path: string): string {
  return 'sha256:' + createHash('sha256').update(readFileSync(path)).digest('hex');
}

async function main(): Promise<void> {
  const a = parseArgs(process.argv.slice(2));
  const outDir = resolve('examples/portfolio', a.slug);
  mkdirSync(outDir, { recursive: true });

  // 1. MP4 + intermediate via existing captureDemo.
  execFileSync(
    'npx',
    [
      'tsx', 'scripts/captureDemo.ts',
      '--script', a.script,
      '--prompt', a.prompt,
      '--module', 'portfolio',
      '--output', outDir,
      '--hero-artifact', a.slug,
    ],
    { stdio: 'inherit' },
  );

  // captureDemo writes demo.mp4 and meta.json (engineering provenance).
  // Portfolio bundle expects build.mp4; preserve captureDemo's meta.json
  // as capture-meta.json before the portfolio meta is written below.
  renameSync(join(outDir, 'demo.mp4'), join(outDir, 'build.mp4'));
  renameSync(join(outDir, 'meta.json'), join(outDir, 'capture-meta.json'));

  // 2. STEP + STL via the kernelcad CLI.
  // Signature: `kernelcad export <format> <file> -o <out>` (positional).
  const stepPath = join(outDir, 'build.step');
  const stlPath = join(outDir, 'build.stl');
  execFileSync('node', ['dist/cli/index.js', 'export', 'step', a.script, '-o', stepPath], { stdio: 'inherit' });

  // STL export: try the CLI path first (works for single-shape scripts).
  // If the script returns a Scene (assembly model), the CLI rejects STL and
  // emits export.no-shape. Fall back to meshing the scene via the same
  // pipeline captureDemo uses and encoding the combined mesh as binary STL.
  const stlResult = spawnSync(
    'node',
    ['dist/cli/index.js', 'export', 'stl', a.script, '-o', stlPath],
    { stdio: 'inherit', encoding: 'utf8' },
  );
  if (stlResult.status !== 0) {
    console.log('capturePortfolioEntry: CLI STL export returned non-zero; falling back to mesh-based STL export');
    const scriptPath = resolve(a.script);
    const loaded = await loadScriptFeatures(scriptPath);
    const { features: featureMeshes, failedFeatureIds } = await meshFeaturesPerFeature(
      loaded.features.map((f) => f.record),
      loaded.paramTable,
      loaded.session,
    );
    if (failedFeatureIds.length > 0) {
      throw new Error(`STL mesh fallback: ${failedFeatureIds.length} feature(s) failed to compile: ${failedFeatureIds.join(', ')}`);
    }
    // Merge all feature meshes into a single vertex/triangle array.
    const allVertices: number[] = [];
    const allTriangles: number[] = [];
    for (const fm of featureMeshes) {
      for (const face of fm.faces) {
        const baseIdx = allVertices.length / 3;
        for (let i = 0; i < face.vertices.length; i++) allVertices.push(face.vertices[i]);
        for (let i = 0; i < face.indices.length; i++) allTriangles.push(baseIdx + face.indices[i]);
      }
    }
    const stlBuf = encodeBinaryStl({ vertices: allVertices, triangles: allTriangles });
    writeFileSync(stlPath, stlBuf);
    console.log(`capturePortfolioEntry: mesh fallback wrote ${stlBuf.length} bytes to ${stlPath}`);
  }

  // 3. Meta.
  const meta: PortfolioMeta = {
    schemaVersion: 1,
    slug: a.slug,
    category: a.category,
    difficulty: a.difficulty,
    sourceUrl: a.sourceUrl,
    sourceLicense: a.sourceLicense,
    paraphrasedPrompt: a.paraphrasedPrompt,
    model: a.model,
    attemptCount: a.attemptCount,
    builtAt: new Date().toISOString().replace(/\.\d+Z$/, 'Z'),
    artifactHashes: { step: sha256(stepPath), stl: sha256(stlPath) },
  };
  writePortfolioMeta(join(outDir, 'meta.json'), meta);

  // 4. README.md
  const readmePath = join(outDir, 'README.md');
  const readmeContent = [
    `# ${a.slug}`,
    '',
    `**Category:** ${a.category}  `,
    `**Difficulty:** ${a.difficulty}  `,
    `**Model:** ${a.model}  `,
    `**Attempts:** ${a.attemptCount}  `,
    '',
    '## Prompt',
    '',
    a.paraphrasedPrompt,
    '',
    '## Artifacts',
    '',
    '| File | Description |',
    '|------|-------------|',
    '| `build.kcad.ts` | kernelCAD source script |',
    '| `build.mp4` | Build + rotate demo video |',
    '| `build.step` | STEP export (multi-body, preserves part names) |',
    '| `build.stl` | STL export (merged mesh) |',
    '| `meta.json` | Portfolio metadata |',
    '',
    `## Source`,
    '',
    `[Original reference](${a.sourceUrl}) — license: ${a.sourceLicense}`,
    '',
  ].join('\n');
  writeFileSync(readmePath, readmeContent, 'utf8');

  console.log(`portfolio entry ready: ${outDir}`);
}

main().catch(err => { console.error(err); process.exit(1); });
