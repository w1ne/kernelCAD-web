// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// eval/oracle/stlBbox.ts
//
// STL-extent oracle for harness bbox gates.
//
// Background: `inspect({ of: 'shape' })` (MCP) returns the BREP AABB — i.e. the
// corner-to-corner bounding box that OCCT reports on the un-meshed shape.
// For turned / chamfered / non-axis-aligned parts that AABB can differ
// noticeably from the *meshed* extent (the cadqueryeval scorer and every
// downstream STL consumer sees the meshed extent, not the BREP one). The
// canonical example is cqe-task22 (chamfered cylindrical prism): BREP AABB
// says 43.3 × 43.3 × 95 while the STL extent is 39.975 × 39.988 × 95 — the
// task target [40, 40, 95] only passes against the mesh extent.
//
// This helper exports the script to a binary STL via `kernelcad export stl`
// and sweeps vertex min/max. Output is cached per (scriptPath, runDir) so
// repeated calls inside a single harness invocation only pay the export
// cost once. The cadqueryeval scorer wrapper (cadQueryEvalScorer.ts) writes
// to `<runDir>/generated.stl`; we write to `<runDir>/bbox-probe.stl` to
// avoid stomping on it (the scorer wrapper writes `generated.stl` even on
// the failure path, so we cannot count on it existing yet).
//
// Binary STL format (little-endian):
//   - 80-byte header
//   - 4-byte uint32: triangle count
//   - 50 bytes per triangle: 12-byte normal (float32 x3) + 36 bytes for 3
//     vertices (float32 x3 each) + 2-byte attribute byte count
//
// Env overrides match cadQueryEvalScorer.ts so behaviour stays consistent:
//   KERNELCAD_BIN  — path to the kernelCAD CLI (default: ./dist/cli/index.js if present, else `kernelcad`).

import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const LOCAL_BUILD = './dist/cli/index.js';

export interface StlBbox {
  min: [number, number, number];
  max: [number, number, number];
  extent: [number, number, number];
}

interface RunResult {
  code: number;
  stdout: string;
  stderr: string;
}

function getKernelcadBin(): { cmd: string; baseArgs: string[] } {
  const override = process.env.KERNELCAD_BIN;
  if (override) {
    if (override.endsWith('.js')) return { cmd: 'node', baseArgs: [override] };
    return { cmd: override, baseArgs: [] };
  }
  if (existsSync(LOCAL_BUILD)) return { cmd: 'node', baseArgs: [LOCAL_BUILD] };
  return { cmd: 'kernelcad', baseArgs: [] };
}

function runOnce(cmd: string, args: string[]): Promise<RunResult> {
  return new Promise((resolveP, rejectP) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d.toString()));
    child.stderr.on('data', (d) => (stderr += d.toString()));
    child.on('error', rejectP);
    child.on('close', (code) => resolveP({ code: code ?? -1, stdout, stderr }));
  });
}

/** Parse a binary STL buffer and return the vertex AABB. Throws on malformed input. */
export function parseBinaryStlBbox(buf: Buffer): StlBbox {
  if (buf.length < 84) {
    throw new Error(`STL buffer too small: ${buf.length} bytes (need >= 84)`);
  }
  const triCount = buf.readUInt32LE(80);
  const expected = 84 + triCount * 50;
  if (buf.length < expected) {
    throw new Error(
      `STL buffer truncated: triangle count=${triCount} expects ${expected} bytes, got ${buf.length}`,
    );
  }
  if (triCount === 0) {
    throw new Error('STL has zero triangles — cannot derive a bbox');
  }

  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  // Each triangle: 12 (normal) + 12*3 (verts) + 2 (attr) = 50 bytes.
  // Vertices start at offset 12 within the triangle record.
  for (let i = 0; i < triCount; i++) {
    const base = 84 + i * 50 + 12;
    for (let v = 0; v < 3; v++) {
      const off = base + v * 12;
      const x = buf.readFloatLE(off);
      const y = buf.readFloatLE(off + 4);
      const z = buf.readFloatLE(off + 8);
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (z < minZ) minZ = z;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
      if (z > maxZ) maxZ = z;
    }
  }

  return {
    min: [minX, minY, minZ],
    max: [maxX, maxY, maxZ],
    extent: [maxX - minX, maxY - minY, maxZ - minZ],
  };
}

// Per-run memoization. Keyed by `${scriptPath}::${runDir}` so reruns inside
// one harness invocation don't pay the export cost twice. Cleared implicitly
// per process so cross-task contamination isn't possible (the runner spawns
// a fresh tsx process — no, actually `runCqeBenchmark.ts` runs all tasks in
// one process, but distinct (scriptPath, runDir) pairs hash to distinct
// keys so there's no cross-task collision).
const cache = new Map<string, StlBbox>();

/**
 * Export `<scriptPath>` to STL inside `<runDir>` and return the meshed AABB.
 *
 * The STL is written to `<runDir>/bbox-probe.stl` (kept on disk for debug —
 * disk impact is negligible vs. the existing per-task artifacts). On a
 * cache hit (same scriptPath + runDir already probed in this process) the
 * cached value is returned without re-exporting.
 */
export async function getStlBbox(scriptPath: string, runDir: string): Promise<StlBbox> {
  const key = `${scriptPath}::${runDir}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const stlPath = join(runDir, 'bbox-probe.stl');
  const { cmd, baseArgs } = getKernelcadBin();
  const args = [...baseArgs, 'export', 'stl', scriptPath, '-o', stlPath];
  const r = await runOnce(cmd, args);
  if (r.code !== 0 || !existsSync(stlPath)) {
    throw new Error(
      `kernelcad export stl failed (exit ${r.code}). stderr=${r.stderr.trim().slice(0, 500)}`,
    );
  }
  const buf = readFileSync(stlPath);
  const bbox = parseBinaryStlBbox(buf);
  cache.set(key, bbox);
  return bbox;
}
