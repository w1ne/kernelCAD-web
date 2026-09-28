// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/mcp/tools/consensusCandidates.ts
//
// Host side of best-of-N consensus selection: execute candidate scripts and
// turn each into the world-frame mesh `selectByConsensus` compares. The
// selector itself (src/agent/loop/consensus.ts) is pure; this file is the
// part that needs OCCT.
//
// Reuse: script run + lowering + per-body world-frame shapes come from
// `evaluateSide` (the `diff_geometry` path), meshes from
// `OcctBackend.getMesh()` — the same tessellation `meshDeviation` already
// consumes in `diff_geometry`.

import type { RuntimeMesh } from '../../../kernel/backends/runtimeMesh';
import {
  selectByConsensus,
  type ConsensusCandidate,
  type ConsensusOptions,
  type ConsensusResult,
} from '../../loop/consensus';
import { loadMcpScriptSource } from '../runMcpScript';
import { evaluateSide } from './diffGeometry';

export interface ExecutedCandidateGeometry {
  /** Merged world-frame mesh of every body; null when the candidate is invalid. */
  mesh: RuntimeMesh | null;
  invalidReason?: string;
}

/** Concatenate meshes into one triangle soup (indices re-based per part). */
export function mergeMeshes(meshes: readonly RuntimeMesh[]): RuntimeMesh {
  if (meshes.length === 1) return meshes[0];
  const vertexTotal = meshes.reduce((s, m) => s + m.positions.length, 0);
  const indexTotal = meshes.reduce((s, m) => s + m.indices.length, 0);
  const positions = new Float32Array(vertexTotal);
  const normals = new Float32Array(vertexTotal);
  const indices = new Uint32Array(indexTotal);
  let vOff = 0;
  let iOff = 0;
  for (const m of meshes) {
    positions.set(m.positions, vOff);
    normals.set(m.normals.subarray(0, m.positions.length), vOff);
    const base = vOff / 3;
    for (let k = 0; k < m.indices.length; k++) indices[iOff + k] = m.indices[k] + base;
    vOff += m.positions.length;
    iOff += m.indices.length;
  }
  return { positions, normals, indices };
}

/**
 * Execute one candidate script and return its merged mesh. A candidate is
 * invalid when the script fails to run or recompute, or when any body is
 * empty, has no positive volume, or cannot be meshed.
 */
export async function executeConsensusCandidate(input: {
  file?: string;
  code?: string;
}): Promise<ExecutedCandidateGeometry> {
  let side: Awaited<ReturnType<typeof evaluateSide>>;
  try {
    side = await evaluateSide(input);
  } catch (e) {
    return { mesh: null, invalidReason: `script failed: ${e instanceof Error ? e.message : String(e)}` };
  }
  if (!side.ok) {
    return { mesh: null, invalidReason: `script failed${side.errorCode ? ` (${side.errorCode})` : ''}: ${side.error}` };
  }
  if (side.side.bodies.length === 0) return { mesh: null, invalidReason: 'script produced no bodies' };

  const meshes: RuntimeMesh[] = [];
  for (const body of side.side.bodies) {
    try {
      if (body.shape.isEmpty()) return { mesh: null, invalidReason: `body '${body.name}' is empty` };
      const volume = body.shape.volume();
      if (!(volume > 0)) return { mesh: null, invalidReason: `body '${body.name}' has no positive volume` };
      meshes.push(body.shape.getMesh());
    } catch (e) {
      return {
        mesh: null,
        invalidReason: `body '${body.name}' is not a valid solid: ${e instanceof Error ? e.message : String(e)}`,
      };
    }
  }
  return { mesh: mergeMeshes(meshes) };
}

export interface ScriptCandidate {
  id?: string;
  file?: string;
  code?: string;
  /** Verify / review gates passed — first tie-break. */
  gatesPassed?: number;
}

/** Execute every candidate script, then select by geometric consensus. */
export async function selectScriptsByConsensus(
  candidates: readonly ScriptCandidate[],
  options?: ConsensusOptions,
): Promise<ConsensusResult> {
  const executed: ConsensusCandidate[] = [];
  for (const c of candidates) {
    const source = await loadMcpScriptSource({ file: c.file, code: c.code });
    const geometry = source.ok
      ? await executeConsensusCandidate({ file: c.file, code: source.code })
      : { mesh: null, invalidReason: `script not readable: ${source.error}` };
    executed.push({
      ...(c.id !== undefined ? { id: c.id } : {}),
      script: source.ok ? source.code : '',
      mesh: geometry.mesh,
      ...(geometry.invalidReason !== undefined ? { invalidReason: geometry.invalidReason } : {}),
      ...(c.gatesPassed !== undefined ? { gatesPassed: c.gatesPassed } : {}),
    });
  }
  return selectByConsensus(executed, options);
}
