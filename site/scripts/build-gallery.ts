#!/usr/bin/env node
// Reads site/gallery/entries.json, validates, evaluates each .kcad.ts → GLB,
// copies videos + extracts posters + runs black-frame gate,
// emits site/public/gallery.json + per-slug assets.

import {
  copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync, statSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseGalleryEntries, type GalleryEntry } from '../../scripts/lib/galleryEntries';
import { extractPoster } from '../../scripts/lib/extractPoster';
import { isVideoMostlyBlack } from '../../scripts/lib/blackFrameCheck';
import { exportGlb } from '../../scripts/lib/exportGlb';

export interface BuildGalleryOptions {
  entriesPath: string;
  publicDir: string;
}

interface PublishedEntry extends Omit<GalleryEntry, 'video' | 'codeLocal'> {
  videoUrl: string;
  posterUrl: string;
  modelUrl: string;
}

const GLB_SIZE_HARD_CAP = 500_000;

export async function buildGallery(opts: BuildGalleryOptions): Promise<void> {
  const raw = JSON.parse(readFileSync(opts.entriesPath, 'utf8'));
  const parsed = parseGalleryEntries(raw);
  const entriesDir = path.dirname(opts.entriesPath);
  const galleryOutDir = path.join(opts.publicDir, 'gallery');
  mkdirSync(galleryOutDir, { recursive: true });

  const published: PublishedEntry[] = [];

  for (const entry of parsed.entries) {
    const slugDir = path.join(galleryOutDir, entry.slug);
    mkdirSync(slugDir, { recursive: true });

    const srcVideo = path.resolve(entriesDir, entry.video);
    if (!existsSync(srcVideo)) {
      throw new Error(`entry ${entry.slug}: video not found at ${srcVideo}`);
    }

    const srcScript = path.resolve(entriesDir, entry.codeLocal);
    if (!existsSync(srcScript)) {
      throw new Error(`entry ${entry.slug}: codeLocal not found at ${srcScript}`);
    }

    const dstVideo = path.join(slugDir, 'video.mp4');
    const dstPoster = path.join(slugDir, 'poster.jpg');
    const dstModel = path.join(slugDir, 'model.glb');
    const dstPrompt = path.join(slugDir, 'prompt.md');

    copyFileSync(srcVideo, dstVideo);
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

    writeFileSync(dstPrompt, entry.prompt + '\n');

    const { video, codeLocal, ...rest } = entry;
    void video; void codeLocal;
    published.push({
      ...rest,
      videoUrl: `/gallery/${entry.slug}/video.mp4`,
      posterUrl: `/gallery/${entry.slug}/poster.jpg`,
      modelUrl: `/gallery/${entry.slug}/model.glb`,
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
