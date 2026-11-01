// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/cfd/parsers.ts
//
// Readers for what OpenFOAM writes: the simpleFoam log (residuals and the
// convergence line), checkMesh's report, function-object .dat tables, and
// the legacy-ASCII VTK cutting plane. Pure text -> data, fixture tested.

import type { CfdMeshReport, CfdResidualSample, Vec3 } from './types';

export interface SolverLog {
  samples: CfdResidualSample[];
  /** `SIMPLE solution converged in N iterations`. */
  convergedAt?: number;
  /** The solver printed `End` (normal exit). */
  finished: boolean;
  /** NaN, floating point exception, or a FOAM FATAL ERROR. */
  failure?: string;
  version?: string;
}

const RESIDUAL = /Solving for (\w+), Initial residual = ([-+\d.eE]+|nan|-?inf)/i;

interface LogState {
  samples: CfdResidualSample[];
  current?: CfdResidualSample;
  failure?: string;
  convergedAt?: number;
}

function readResidual(st: LogState, line: string): boolean {
  const r = RESIDUAL.exec(line);
  if (!r || st.current === undefined) return false;
  const v = Number(r[2]);
  // First occurrence per field per iteration is the one SIMPLE reports
  // (p can be solved twice with non-orthogonal correctors).
  if (st.current.initial[r[1]] === undefined) st.current.initial[r[1]] = Number.isFinite(v) ? v : Number.NaN;
  if (!Number.isFinite(v)) st.failure ??= `non-finite ${r[1]} residual at iteration ${st.current.iteration}`;
  return true;
}

function readLogLine(st: LogState, line: string): void {
  const t = /^Time = ([\d.eE+-]+)\s*$/.exec(line.trim());
  if (t) {
    st.current = { iteration: Number(t[1]), initial: {} };
    st.samples.push(st.current);
    return;
  }
  if (readResidual(st, line)) return;
  const c = /SIMPLE solution converged in (\d+) iterations/.exec(line);
  if (c) st.convergedAt = Number(c[1]);
  if (/sigFpe::sigHandler/.test(line) || (/Floating point exception/.test(line) && !/trapping/i.test(line))) {
    st.failure ??= 'floating point exception (the solution diverged)';
  }
  if (/FOAM FATAL (IO )?ERROR/.test(line)) st.failure ??= 'FOAM FATAL ERROR (see the solver log)';
}

export function parseSolverLog(text: string): SolverLog {
  const st: LogState = { samples: [] };
  for (const line of text.split('\n')) readLogLine(st, line);
  const version = /Version:\s+(\S+)/.exec(text)?.[1];
  return {
    samples: st.samples,
    ...(st.convergedAt !== undefined ? { convergedAt: st.convergedAt } : {}),
    finished: /^End\s*$/m.test(text),
    ...(st.failure !== undefined ? { failure: st.failure } : {}),
    ...(version !== undefined ? { version } : {}),
  };
}

const numAfter = (text: string, re: RegExp): number | undefined => {
  const m = re.exec(text);
  return m ? Number(m[1]) : undefined;
};

function patchTable(text: string): Record<string, number> {
  const out: Record<string, number> = {};
  const block = /Checking patch topology[^\n]*\n([\s\S]*?)\n\s*\n/.exec(text)?.[1] ?? '';
  for (const line of block.split('\n')) {
    const m = /^\s*(\w[\w.-]*)\s+(\d+)\s+(\d+)\s/.exec(line);
    if (m && m[1] !== 'Patch') out[m[1]] = Number(m[2]);
  }
  return out;
}

export function parseCheckMesh(text: string): CfdMeshReport {
  const failed = numAfter(text, /Failed (\d+) mesh checks/);
  const maxNonOrthogonality = numAfter(text, /non-orthogonality Max:\s*([-+\d.eE]+)/);
  const maxSkewness = numAfter(text, /Max skewness = ([-+\d.eE]+)/);
  const maxAspectRatio = numAfter(text, /Max aspect ratio = ([-+\d.eE]+)/);
  return {
    cells: numAfter(text, /^\s*cells:\s+(\d+)/m) ?? 0,
    faces: numAfter(text, /^\s*faces:\s+(\d+)/m) ?? 0,
    points: numAfter(text, /^\s*points:\s+(\d+)/m) ?? 0,
    ok: /^\s*Mesh OK\./m.test(text),
    failedChecks: failed ?? 0,
    ...(maxNonOrthogonality !== undefined ? { maxNonOrthogonality } : {}),
    ...(maxSkewness !== undefined ? { maxSkewness } : {}),
    ...(maxAspectRatio !== undefined ? { maxAspectRatio } : {}),
    patchFaces: patchTable(text),
  };
}

/** A function-object table: rows of numbers, `#` comments skipped. */
export function parseDatTable(text: string): number[][] {
  const rows: number[][] = [];
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (t === '' || t.startsWith('#')) continue;
    const vals = t.replace(/[()]/g, ' ').split(/\s+/).map(Number);
    if (vals.every(Number.isFinite)) rows.push(vals);
  }
  return rows;
}

/** Last row's column `col` (0 = time), or undefined. */
export function lastValue(text: string, col = 1): number | undefined {
  const rows = parseDatTable(text);
  const last = rows[rows.length - 1];
  return last !== undefined && last.length > col ? last[col] : undefined;
}

export interface VtkPlane {
  points: Vec3[];
  polygons: number[][];
  /** Cell-centred fields by name; vectors as flat triples. */
  cellFields: Record<string, { components: number; values: number[] }>;
}

const isFieldHeader = (tok: readonly string[], i: number): boolean =>
  /^[A-Za-z_]\w*$/.test(tok[i]) && /^\d+$/.test(tok[i + 1] ?? '') && /^\d+$/.test(tok[i + 2] ?? '') && /^(float|double)$/.test(tok[i + 3] ?? '');

/** Read one VTK section starting at tok[i]; returns the next index. */
function readVtkSection(tok: readonly string[], i: number, out: VtkPlane, inCellData: { on: boolean }): number {
  const w = tok[i];
  if (w === 'POINTS') {
    const n = Number(tok[i + 1]);
    let k = i + 3;
    for (let p = 0; p < n; p++, k += 3) out.points.push([Number(tok[k]), Number(tok[k + 1]), Number(tok[k + 2])]);
    return k;
  }
  if (w === 'POLYGONS') {
    const n = Number(tok[i + 1]);
    let k = i + 3;
    for (let p = 0; p < n; p++) {
      const m = Number(tok[k]);
      out.polygons.push(tok.slice(k + 1, k + 1 + m).map(Number));
      k += m + 1;
    }
    return k;
  }
  if (w === 'CELL_DATA' || w === 'POINT_DATA') {
    inCellData.on = w === 'CELL_DATA';
    return i + 2;
  }
  if (inCellData.on && isFieldHeader(tok, i)) {
    const comps = Number(tok[i + 1]);
    const n = Number(tok[i + 2]);
    out.cellFields[w] = { components: comps, values: tok.slice(i + 4, i + 4 + comps * n).map(Number) };
    return i + 4 + comps * n;
  }
  return i + 1;
}

/** Legacy ASCII POLYDATA as written by OpenFOAM's vtk surface writer. */
export function parseVtkPolyData(text: string): VtkPlane {
  const tok = text.split(/\s+/).filter(s => s !== '');
  const out: VtkPlane = { points: [], polygons: [], cellFields: {} };
  const inCellData = { on: false };
  for (let i = 0; i < tok.length;) i = readVtkSection(tok, i, out, inCellData);
  return out;
}
