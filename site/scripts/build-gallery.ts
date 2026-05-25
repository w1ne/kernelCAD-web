#!/usr/bin/env node
// Reads site/gallery/entries.json, validates, evaluates each .kcad.ts → GLB,
// copies videos + extracts posters + runs black-frame gate,
// emits site/public/gallery.json + per-slug assets.

import {
  copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync, statSync, rmSync,
} from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseGalleryEntries,
  validateMechanismReviewEvidenceFiles,
  type GalleryEntry,
} from '../../scripts/lib/galleryEntries';
import { extractPoster } from '../../scripts/lib/extractPoster';
import { isVideoMostlyBlack } from '../../scripts/lib/blackFrameCheck';
import { exportGlb } from '../../scripts/lib/exportGlb';
import { loadScriptFeatures } from '../../src/modeling/runtime/scriptLoader';
import { meshFeaturesPerFeature } from '../../src/modeling/capture/featureMeshing';
import { serializeForBridge } from '../../src/modeling/capture/featureMeshSerialize';

export interface BuildGalleryOptions {
  entriesPath: string;
  publicDir: string;
}

interface PublishedEntry extends Omit<GalleryEntry, 'video' | 'codeLocal'> {
  videoUrl: string;
  posterUrl: string;
  modelUrl: string;
  promptUrl: string;
  sourceUrl: string | null;
  studioUrl: string;
}

const GLB_SIZE_HARD_CAP = 500_000;
const STUDIO_ORIGIN = 'https://app.kernelcad.com';

export async function buildGallery(opts: BuildGalleryOptions): Promise<void> {
  const raw = JSON.parse(readFileSync(opts.entriesPath, 'utf8'));
  const parsed = parseGalleryEntries(raw);
  const entriesDir = path.dirname(opts.entriesPath);
  validateMechanismReviewEvidenceFiles(parsed.entries, entriesDir);

  const galleryOutDir = path.join(opts.publicDir, 'gallery');
  // Idempotent: wipe stale per-slug dirs from earlier builds so dropped
  // candidates don't leave orphans the dev symlink loop would re-link.
  if (existsSync(galleryOutDir)) rmSync(galleryOutDir, { recursive: true, force: true });
  mkdirSync(galleryOutDir, { recursive: true });

  // Precomputed mesh bridge payloads, keyed by sha256(source). The hosted
  // Studio fetches `/gallery/_mesh/<sha>.json` to render a curated model's
  // initial view with zero server compute (see scriptSource.meshSourceHosted).
  const meshOutDir = path.join(galleryOutDir, '_mesh');
  mkdirSync(meshOutDir, { recursive: true });

  const published: PublishedEntry[] = [];

  for (const entry of parsed.entries) {
    const slugDir = path.join(galleryOutDir, entry.slug);
    mkdirSync(slugDir, { recursive: true });

    const srcVideo = path.resolve(entriesDir, entry.video);
    if (!existsSync(srcVideo)) {
      throw new Error(`entry ${entry.slug}: video not found at ${srcVideo}`);
    }

    if (entry.source === 'studio' && !entry.codeLocal) {
      throw new Error(`entry ${entry.slug}: studio gallery entries without codeLocal are not buildable yet`);
    }

    const srcScript = path.resolve(entriesDir, entry.codeLocal);
    if (!existsSync(srcScript)) {
      throw new Error(`entry ${entry.slug}: codeLocal not found at ${srcScript}`);
    }

    const dstVideo = path.join(slugDir, 'video.mp4');
    const dstPoster = path.join(slugDir, 'poster.jpg');
    const dstModel = path.join(slugDir, 'model.glb');
    const dstPrompt = path.join(slugDir, 'prompt.md');
    const dstSource = path.join(slugDir, 'source.kcad.ts');
    const sourceUrl = entry.source === 'curated' ? `/gallery/${entry.slug}/source.kcad.ts` : null;
    const studioUrl = entry.source === 'curated'
      ? `${STUDIO_ORIGIN}/studio?gallery=${encodeURIComponent(entry.slug)}`
      : entry.appUrl;

    copyFileSync(srcVideo, dstVideo);
    if (entry.source === 'curated') {
      copyFileSync(srcScript, dstSource);
    }

    await extractPoster({ videoPath: dstVideo, outPath: dstPoster, timestampSeconds: 2 });

    const isBlack = await isVideoMostlyBlack(dstVideo, {
      sampleCount: 5,
      blackThreshold: 0.95,
    });
    if (isBlack) {
      throw new Error(`entry ${entry.slug}: video is mostly black (failed visual gate)`);
    }

    await exportGlb({ scriptPath: srcScript, outPath: dstModel });
    const glbSize = statSync(dstModel).size;
    if (glbSize > GLB_SIZE_HARD_CAP) {
      throw new Error(
        `entry ${entry.slug}: model.glb is ${glbSize} bytes; exceeds ${GLB_SIZE_HARD_CAP} byte hard cap. Decimate the mesh.`,
      );
    }

    // Precompute the mesh bridge payload for curated entries so the hosted
    // Studio renders the initial view from a static file. Keyed by the
    // sha256 of the exact source bytes served at source.kcad.ts — the same
    // digest the browser computes via Web Crypto in scriptSource.meshSourceHosted.
    if (entry.source === 'curated') {
      // Non-fatal: a model that fails to precompute simply won't have a static
      // mesh file. The hosted Studio then falls back to its backend (or shows
      // a clear error for that one model) — far better than failing the entire
      // marketing deploy over one bad source. exportGlb above already gates on
      // the source meshing, so this rarely triggers.
      try {
        const sourceText = readFileSync(srcScript, 'utf8');
        const sha = createHash('sha256').update(sourceText, 'utf8').digest('hex');
        const loaded = await loadScriptFeatures(srcScript);
        const meshing = await meshFeaturesPerFeature(
          loaded.features.map((f) => f.record),
          loaded.paramTable,
          loaded.session as unknown as Parameters<typeof meshFeaturesPerFeature>[2],
        );
        if (meshing.failedFeatureIds.length > 0) {
          console.warn(
            `build-gallery: ${entry.slug} precompute skipped — ${meshing.failedFeatureIds.length} feature(s) failed to mesh: ${meshing.failedFeatureIds.join(', ')}`,
          );
        } else {
          const bridgePayload = {
            source: sourceText,
            features: meshing.features.map(serializeForBridge),
            featureRecords: loaded.features.map((f) => f.record),
            bounds: meshing.bounds,
            params: loaded.paramTable.serialize(),
          };
          writeFileSync(path.join(meshOutDir, `${sha}.json`), JSON.stringify(bridgePayload));
        }
      } catch (err) {
        console.warn(
          `build-gallery: ${entry.slug} precompute skipped — ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    writeFileSync(dstPrompt, entry.prompt + '\n');

    const { video, codeLocal, mechanismReview, ...rest } = entry;
    void video; void codeLocal; void mechanismReview;
    published.push({
      ...rest,
      videoUrl: `/gallery/${entry.slug}/video.mp4`,
      posterUrl: `/gallery/${entry.slug}/poster.jpg`,
      modelUrl: `/gallery/${entry.slug}/model.glb`,
      promptUrl: `/gallery/${entry.slug}/prompt.md`,
      sourceUrl,
      studioUrl,
    });
  }

  const out = { generatedAt: new Date().toISOString(), entries: published };
  writeFileSync(path.join(opts.publicDir, 'gallery.json'), JSON.stringify(out, null, 2));
}

// CLI entrypoint
if (import.meta.url === `file://${process.argv[1]}`) {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const REPO_ROOT = path.resolve(__dirname, '../..');
  buildGallery({
    entriesPath: path.join(REPO_ROOT, 'site/gallery/entries.json'),
    publicDir: path.join(REPO_ROOT, 'site/public'),
  }).then(
    () => console.log('✓ gallery.json + per-slug assets written'),
    (err) => { console.error('build-gallery failed:', err); process.exit(1); },
  );
}
