// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/mcp/tools/diffGeometryRender.ts
//
// Optional PNG overlay for `diff_geometry` — added material green, removed
// material red — for the human at the END of the loop. The agent's own
// evidence is the numeric table; this is the picture it hands a reviewer.
//
// It does NOT contain a renderer. The delta solids (B−A, A−B) and the common
// material (A∩B) are written as BREP sidecars — lossless, exact topology, the
// format kernelCAD uses to move kernel state between processes. A tiny
// generated `.kcad.ts` re-imports them with `lib.fromBREP` as parts of one
// assembly (added green, removed red, common as a translucent ghost for
// context), and that script goes through `render_preview` unchanged — the
// same headless pipeline `kernelcad render` uses. STL is deliberately not
// the carrier: thin delta shells (a hole widened by 1 mm is a 1 mm-wall tube)
// do not always re-sew into a closed solid from a triangle soup.
//
// Fails OPEN, never silently: if the render pipeline is unavailable (no
// prebuilt headless player and no dev server), the overlay reports ok:false
// with the pipeline's own message and the numeric diff is still returned.

import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import type { OcctBackend } from '../../../kernel/backends/occt/occtBackend';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import { renderPreviewTool } from './renderPreview';

/** Green for material that APPEARED in the revision. */
const ADDED_COLOR = '#2ecc71';
/** Red for material that VANISHED from the baseline. */
const REMOVED_COLOR = '#e74c3c';
/** Neutral translucent ghost for material present on both sides. */
const COMMON_COLOR = '#b8bcc0';
const COMMON_OPACITY = 0.22;

export interface DiffOverlayRender {
  ok: boolean;
  /** Absolute PNG paths on the MCP server's filesystem (on success). */
  images?: string[];
  /** Directory holding the overlay script, its STL inputs, and the PNGs. */
  out_dir?: string;
  /** The generated overlay script — readable, re-runnable, not a black box. */
  script_path?: string;
  /** Solids that went into the overlay. */
  addedBodies?: string[];
  removedBodies?: string[];
  error?: string;
}

export interface OverlayPair {
  base: { name: string; shape: OcctBackend };
  revised: { name: string; shape: OcctBackend };
}

function slug(name: string): string {
  return name.replace(/[^A-Za-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '') || 'body';
}

/** Clone-both-operands boolean, matching the diff's own convention. Returns
 *  undefined when the result is empty or the boolean refused. */
function booleanSolid(a: OcctBackend, b: OcctBackend, op: 'subtract' | 'intersect'): OcctBackend | undefined {
  try {
    const out = op === 'subtract' ? a.clone().subtract(b.clone()) : a.clone().intersect(b.clone());
    return out.isEmpty() ? undefined : out;
  } catch {
    return undefined;
  }
}

export interface DiffOverlayScene {
  dir: string;
  /** Undefined when neither side added nor removed any material. */
  scriptPath?: string;
  addedBodies: string[];
  removedBodies: string[];
}

/**
 * Write the overlay scene — BREP sidecars plus the generated assembly script —
 * without rendering it. Split from the render step so the scene is a
 * first-class, evaluable artifact (and testable without a browser).
 */
export async function writeDiffOverlayScene(
  pairs: readonly OverlayPair[],
  outDir?: string,
): Promise<DiffOverlayScene> {
  const dir = outDir !== undefined
    ? resolve(outDir)
    : await mkdtemp(join(tmpdir(), 'kernelcad-diff-overlay-'));
  await mkdir(dir, { recursive: true });

  const imports: string[] = [];
  const parts: string[] = [];
  const addedBodies: string[] = [];
  const removedBodies: string[] = [];
  const usedIds = new Set<string>();

  for (const pair of pairs) {
    let id = slug(pair.base.name);
    for (let n = 1; usedIds.has(id); n++) id = `${slug(pair.base.name)}_${n}`;
    usedIds.add(id);

    const layers: Array<[kind: 'common' | 'added' | 'removed', solid: OcctBackend | undefined]> = [
      ['common', booleanSolid(pair.base.shape, pair.revised.shape, 'intersect')],
      ['added', booleanSolid(pair.revised.shape, pair.base.shape, 'subtract')],
      ['removed', booleanSolid(pair.base.shape, pair.revised.shape, 'subtract')],
    ];
    for (const [kind, solid] of layers) {
      if (solid === undefined) continue;
      const file = `${kind}-${id}.brep`;
      await writeFile(join(dir, file), Buffer.from(solid.exportBREP()));
      const binding = `${kind}_${id}`;
      imports.push(`const ${binding} = await lib.fromBREP('./${file}');`);
      const appearance = kind === 'common'
        ? `.material({ baseColor: '${COMMON_COLOR}', roughness: 0.6, opacity: ${COMMON_OPACITY} })`
        : `.finish('paint-matte', { color: '${kind === 'added' ? ADDED_COLOR : REMOVED_COLOR}' })`;
      parts.push(`overlay.part('${binding}', ${binding}${appearance});`);
      if (kind === 'added') addedBodies.push(pair.base.name);
      if (kind === 'removed') removedBodies.push(pair.base.name);
    }
  }

  if (addedBodies.length === 0 && removedBodies.length === 0) {
    return { dir, addedBodies, removedBodies };
  }

  const script = [
    '// Generated by diff_geometry({ render: true }). Added material is green,',
    '// removed material is red, material present on both sides is a translucent',
    '// ghost. Re-runnable: kernelcad render inspect <this file> <outDir>.',
    ...imports,
    "const overlay = assembly('diff-overlay');",
    ...parts,
    'return overlay.model();',
    '',
  ].join('\n');

  const scriptPath = join(dir, 'diff-overlay.kcad.ts');
  await writeFile(scriptPath, script, 'utf8');
  return { dir, scriptPath, addedBodies, removedBodies };
}

export async function renderDiffOverlay(
  pairs: readonly OverlayPair[],
  outDir?: string,
): Promise<{ render: DiffOverlayRender; diagnostics: CompilerDiagnostic[] }> {
  const scene = await writeDiffOverlayScene(pairs, outDir);
  const { dir, scriptPath, addedBodies, removedBodies } = scene;

  if (scriptPath === undefined) {
    // Nothing changed: an empty overlay is the honest picture, not an error.
    return { render: { ok: true, out_dir: dir, images: [], addedBodies, removedBodies }, diagnostics: [] };
  }

  // The overlay is a picture of a delta, not a mechanism: skip the
  // mechanism-truth probe, which would only report unmated parts.
  const preview = await renderPreviewTool({ file: scriptPath, out_dir: dir, views: ['iso'], no_mechanism_check: true });
  if (!preview.ok) {
    return {
      render: {
        ok: false,
        out_dir: dir,
        script_path: scriptPath,
        addedBodies,
        removedBodies,
        error: preview.error ?? 'render_preview did not produce an overlay image.',
      },
      diagnostics: preview.diagnostics ?? [],
    };
  }

  return {
    render: {
      ok: true,
      out_dir: dir,
      script_path: scriptPath,
      images: (preview.images ?? []).map((i) => i.path),
      addedBodies,
      removedBodies,
    },
    diagnostics: [],
  };
}
