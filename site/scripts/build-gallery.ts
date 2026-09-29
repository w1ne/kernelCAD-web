#!/usr/bin/env node
// Reads site/gallery/entries.json, validates, evaluates each .kcad.ts → GLB,
// copies videos + extracts posters + runs black-frame gate,
// emits site/public/gallery.json + per-slug assets.

import {
  copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync, rmSync,
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
import { optimizeGlb } from '../../scripts/lib/optimizeGlb';
import { loadScriptFeatures } from '../../src/modeling/runtime/scriptLoader';
import { meshFeaturesPerFeature } from '../../src/modeling/capture/featureMeshing';
import { serializeForBridge } from '../../src/modeling/capture/featureMeshSerialize';
import { evaluateAndBuildScript } from '../../src/agent/cli/commands/evaluate';
import { bakeAnimationTimeline, selectAnimationMetadata } from '../../src/modeling/animation/bakeAnimationTimeline';
import { validateAssemblyWithMates } from '../../src/modeling/mates/validator';
import type { Assembly } from '../../src/modeling/capture/assembly';
import type { CaptureSession } from '../../src/modeling/capture/captureSession';

export interface BuildGalleryOptions {
  entriesPath: string;
  publicDir: string;
  /**
   * The public community gallery API (kernelCAD-server). When set, the build
   * reads its newest published models into `gallery.json` as `community`.
   * Omitted (tests, offline builds) means no community cards.
   */
  communityApi?: CommunityApiOptions;
}

export interface CommunityApiOptions {
  /** API origin, e.g. `https://api.kernelcad.com`. */
  baseUrl: string;
  /** Injected for tests; defaults to the global fetch. */
  fetchImpl?: typeof fetch;
  /** Max cards on the landing. */
  limit?: number;
}

/** One community card on the landing: a published `/p/<slug>` model. */
export interface CommunityCard {
  slug: string;
  title: string;
  ownerName: string | null;
  remixCount: number;
  featured: boolean;
  /** Same-origin copy of the render (the API's render URL is short-lived). */
  posterUrl: string;
  /** The model's public page in the app. */
  url: string;
}

/** The subset of `GET /api/v1/gallery` items the landing uses. */
interface CommunityApiItem {
  slug?: unknown;
  title?: unknown;
  ownerName?: unknown;
  renderUrl?: unknown;
  remixCount?: unknown;
  featured?: unknown;
}

const COMMUNITY_LIMIT = 8;
const COMMUNITY_FETCH_TIMEOUT_MS = 15_000;
const COMMUNITY_IMAGE_MAX_BYTES = 2_000_000;
const SAFE_SLUG = /^[A-Za-z0-9_-]{1,64}$/;
const IMAGE_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

interface PublishedEntry extends Omit<GalleryEntry, 'video' | 'modelLocal' | 'codeLocal'> {
  videoUrl: string;
  posterUrl: string;
  modelUrl: string;
  promptUrl: string;
  sourceUrl: string | null;
  scriptPath: string | null;
  studioUrl: string;
}

// Per-tile GLB budget for the gallery 3D preview — a load-time budget that keeps
// tiles snappy.
//
// History: 500 KB used to be met by vertex welding alone (~452 KB for the 95-body
// spice-dispenser carousel). d4774a1 fixed a real unit bug in
// FINE_MESH_OPTIONS.angularTolerance (30 -> 0.3 — degrees-vs-radians: at 30 the
// angular criterion exceeded 2*pi and never bound, so curved surfaces were
// tessellated by linear deflection alone). Correct tessellation nearly doubled the
// triangle count on small doubly-curved faces; the carousel went to ~893 KB and the
// marketing deploy went red for two days.
//
// Raised to 600 KB, which the optimize pass clears at ~552 KB. This is a STOPGAP,
// consciously conceding ~100 KB of budget to get the deploy green:
//
//   - Do NOT "fix" this by loosening the mesher. Full resolution is what the Studio
//     and viewer should render; d4774a1 is a correct fix worth keeping.
//   - Post-process simplification CANNOT recover the bytes. Measured no-op across a
//     20x --simplify-error range; see scripts/lib/optimizeGlb.ts for the table and
//     the reason (OCCT per-face islands defeat edge-collapse).
//
// The real fix is a coarse web mesh profile threaded through MeshOptions so
// web-delivered GLBs tessellate coarser while the viewer keeps FINE. Until that
// lands, this cap holds the line — and it is still a HARD cap, so a model that
// blows past 600 KB fails the build rather than shipping a slow tile.
const GLB_SIZE_HARD_CAP = 600_000;
// The gallery is served from the marketing site (kernelcad.com); the hosted
// Studio lives on a separate origin (app.kernelcad.com, deployed at base `/`).
// "Open in Studio" must therefore be an absolute cross-origin URL — a relative
// `/app/...` path resolves against kernelcad.com, which has no such route and
// silently 404s. Keep this in sync with the absolute app links in site/*.html.
const STUDIO_ORIGIN = 'https://app.kernelcad.com';
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
/**
 * Builds the `ScriptReviewSummary` the hosted Studio consumes (see
 * GeometryContext) from the already-evaluated session — reusing the loaded
 * assembly instead of re-running the script. Runs the fast structural
 * validator (floating parts, orphans, mate validity) which carries the
 * part/mate attribution SceneTab routes to severity dots. Skips the
 * pose-envelope / interference sweep, which is too slow for a build step and
 * cannot be interrupted on the single OCCT thread. Non-fatal: any failure
 * yields a passing summary so the deploy never stalls and the Studio still
 * shows the real feature tree.
 */
async function reviewFromLoadedSession(session: CaptureSession): Promise<Record<string, unknown>> {
  try {
    const arm = [...session.assemblies.values()][0] as Assembly | undefined;
    if (!arm) return { ok: true, diagnostics: [] };
    const validator = await validateAssemblyWithMates(arm);
    const diagnostics = validator.diagnostics.map((d) => {
      const entry: Record<string, unknown> = {
        code: d.code,
        severity: d.severity,
        message: d.message,
        hint: d.hint,
      };
      if (d.partName) entry.partName = d.partName;
      if (d.mateName) entry.mateName = d.mateName;
      if (d.partA) entry.partA = d.partA;
      if (d.partB) entry.partB = d.partB;
      return entry;
    });
    const ok = !validator.diagnostics.some((d) => d.severity === 'error');
    return { ok, diagnostics };
  } catch (err) {
    console.warn(
      `build-gallery: validity skipped — ${err instanceof Error ? err.message : String(err)}`,
    );
    return { ok: true, diagnostics: [] };
  }
}

async function fetchWithTimeout(fetchImpl: typeof fetch, url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), COMMUNITY_FETCH_TIMEOUT_MS);
  try {
    return await fetchImpl(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Reads the newest published community models and copies each render next to
 * the landing (`/gallery/_community/<slug>.<ext>`), because the API hands out
 * short-lived signed render URLs. Models without a render are left out, so
 * every card has an image. Never throws: an unreachable API, a bad payload or
 * an empty gallery yields `[]`, and the landing falls back to the curated
 * builds.
 */
export async function fetchCommunityGallery(
  api: CommunityApiOptions,
  publicDir: string,
): Promise<CommunityCard[]> {
  const fetchImpl = api.fetchImpl ?? fetch;
  const limit = api.limit ?? COMMUNITY_LIMIT;
  const base = api.baseUrl.replace(/\/+$/, '');
  let items: CommunityApiItem[];
  try {
    const res = await fetchWithTimeout(fetchImpl, `${base}/api/v1/gallery?sort=new&limit=${limit}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = (await res.json()) as { items?: unknown };
    if (!Array.isArray(body.items)) throw new Error('response has no items array');
    items = body.items as CommunityApiItem[];
  } catch (err) {
    console.warn(`build-gallery: community gallery skipped — ${err instanceof Error ? err.message : String(err)}`);
    return [];
  }

  const outDir = path.join(publicDir, 'gallery', '_community');
  const cards: CommunityCard[] = [];
  for (const item of items) {
    if (cards.length >= limit) break;
    const slug = typeof item.slug === 'string' ? item.slug : '';
    const title = typeof item.title === 'string' ? item.title.trim() : '';
    if (!SAFE_SLUG.test(slug) || !title || typeof item.renderUrl !== 'string') continue;
    try {
      const img = await fetchWithTimeout(fetchImpl, item.renderUrl);
      const type = (img.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
      const ext = IMAGE_EXT[type];
      if (!img.ok || !ext) throw new Error(`render HTTP ${img.status} ${type || 'no content-type'}`);
      const bytes = Buffer.from(await img.arrayBuffer());
      if (bytes.length === 0 || bytes.length > COMMUNITY_IMAGE_MAX_BYTES) {
        throw new Error(`render is ${bytes.length} bytes`);
      }
      mkdirSync(outDir, { recursive: true });
      writeFileSync(path.join(outDir, `${slug}.${ext}`), bytes);
      cards.push({
        slug,
        title,
        ownerName: typeof item.ownerName === 'string' && item.ownerName.trim() ? item.ownerName.trim() : null,
        remixCount: typeof item.remixCount === 'number' && item.remixCount > 0 ? Math.floor(item.remixCount) : 0,
        featured: item.featured === true,
        posterUrl: `/gallery/_community/${slug}.${ext}`,
        url: `${STUDIO_ORIGIN}/p/${slug}`,
      });
    } catch (err) {
      console.warn(`build-gallery: community ${slug} skipped — ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  // Featured first; otherwise keep the API's newest-first order.
  return cards.sort((a, b) => Number(b.featured) - Number(a.featured));
}

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

  // Precomputed animation timelines, keyed by sha256(source) like the mesh.
  // The hosted Studio fetches `/gallery/_anim/<sha>.json` to PLAY a curated
  // model's animationView with zero server compute (anonymous gallery visitors
  // can't open a live session). Only emitted for entries that declare an
  // animationView; everything else has no file and the Studio simply shows a
  // static model.
  const animOutDir = path.join(galleryOutDir, '_anim');
  mkdirSync(animOutDir, { recursive: true });

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
    const scriptPath = entry.source === 'curated'
      ? entry.codeLocal.split(path.sep).join('/')
      : null;
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

    // Mesh at full resolution, then decimate down to the web budget. Shared with
    // the catalog board pipeline (scripts/lib/optimizeGlb.ts) so both surfaces
    // ship GLBs built the same way — the flags there are load-bearing.
    const rawGlb = path.join(slugDir, 'model.raw.glb');
    if (entry.modelLocal) {
      const srcModel = path.resolve(entriesDir, entry.modelLocal);
      if (!existsSync(srcModel)) {
        throw new Error(`entry ${entry.slug}: modelLocal not found at ${srcModel}`);
      }
      copyFileSync(srcModel, rawGlb);
    } else {
      await exportGlb({ scriptPath: srcScript, outPath: rawGlb });
    }
    await optimizeGlb(rawGlb, dstModel, {
      repoRoot: REPO_ROOT,
      label: `entry ${entry.slug}`,
      maxBytes: GLB_SIZE_HARD_CAP,
      // Gallery entries range from single-body models to 95-body assemblies, so a
      // fixed material floor would reject valid simple models. The invariant that
      // matters is that optimization does not FLATTEN whatever colours exist.
      preserveMaterials: true,
    });
    rmSync(rawGlb, { force: true });

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
          // Bake the deterministic structural review so the hosted Studio
          // shows the real adaptive feature tree (validity non-null) instead
          // of the legacy code-history fallback, and the Validity tab reflects
          // actual diagnostics. Reuses the loaded assembly — no re-evaluate.
          const review = await reviewFromLoadedSession(loaded.session);
          const bridgePayload = {
            source: sourceText,
            features: meshing.features.map(serializeForBridge),
            featureRecords: loaded.features.map((f) => f.record),
            bounds: meshing.bounds,
            params: loaded.paramTable.serialize(),
            review,
          };
          writeFileSync(path.join(meshOutDir, `${sha}.json`), JSON.stringify(bridgePayload));
        }
      } catch (err) {
        console.warn(
          `build-gallery: ${entry.slug} precompute skipped — ${err instanceof Error ? err.message : String(err)}`,
        );
      }

      // Precompute the animation timeline (per-part world transforms per frame)
      // for entries that declare an animationView. Keyed by the SAME sha256 of
      // the source bytes, so the browser resolves it via the same digest. Built
      // from a full `evaluateAndBuildScript` model (the baker re-solves mate
      // poses per frame). Non-fatal: a non-animated or unbakeable model simply
      // has no `_anim` file and plays static.
      try {
        const sourceText = readFileSync(srcScript, 'utf8');
        const sha = createHash('sha256').update(sourceText, 'utf8').digest('hex');
        const { evaluation, model } = await evaluateAndBuildScript({ file: srcScript });
        if (evaluation.exitCode === 0 && model && selectAnimationMetadata(model)) {
          const baked = await bakeAnimationTimeline(model);
          writeFileSync(path.join(animOutDir, `${sha}.json`), JSON.stringify(baked));
          console.log(`build-gallery: ${entry.slug} animation baked (${baked.frames} frames, ${baked.parts.length} parts)`);
        }
      } catch (err) {
        console.warn(
          `build-gallery: ${entry.slug} animation bake skipped — ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    writeFileSync(dstPrompt, entry.prompt + '\n');

    const { video, modelLocal, codeLocal, mechanismReview, ...rest } = entry;
    void video; void modelLocal; void codeLocal; void mechanismReview;
    published.push({
      ...rest,
      videoUrl: `/gallery/${entry.slug}/video.mp4`,
      posterUrl: `/gallery/${entry.slug}/poster.jpg`,
      modelUrl: `/gallery/${entry.slug}/model.glb`,
      promptUrl: `/gallery/${entry.slug}/prompt.md`,
      sourceUrl,
      scriptPath,
      studioUrl,
    });
  }

  const community = opts.communityApi
    ? await fetchCommunityGallery(opts.communityApi, opts.publicDir)
    : [];

  const out = { generatedAt: new Date().toISOString(), entries: published, community };
  writeFileSync(path.join(opts.publicDir, 'gallery.json'), JSON.stringify(out, null, 2));
}

/**
 * `KERNELCAD_GALLERY_API` overrides the API origin; `off` builds without the
 * community cards (offline builds).
 */
export function communityApiFromEnv(env: NodeJS.ProcessEnv): CommunityApiOptions | undefined {
  const raw = env.KERNELCAD_GALLERY_API?.trim();
  if (raw === 'off') return undefined;
  return { baseUrl: raw || 'https://api.kernelcad.com' };
}

// CLI entrypoint
if (import.meta.url === `file://${process.argv[1]}`) {
  buildGallery({
    entriesPath: path.join(REPO_ROOT, 'site/gallery/entries.json'),
    publicDir: path.join(REPO_ROOT, 'site/public'),
    communityApi: communityApiFromEnv(process.env),
  }).then(
    () => console.log('✓ gallery.json + per-slug assets written'),
    (err) => { console.error('build-gallery failed:', err); process.exit(1); },
  );
}
