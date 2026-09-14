// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/fea/frdParser.ts
//
// Parser for CalculiX result files (.frd).
//
// Format, only the part we need: result blocks open with ` -4  <NAME>`,
// declare components with ` -5` lines, carry one ` -1` line per node, and
// close with ` -3`. A value line is FIXED-WIDTH — `1X,'-1',I10,6E12.5` — and
// CalculiX writes the columns butted together, so a negative value arrives as
// `1.49381E-02-9.54959E-06` with no separator. Splitting on whitespace merges
// two components into one nonsense number; the only correct read is by column.
//
// Von Mises is computed here rather than asked of the solver: CalculiX's .frd
// carries the six raw components, and deriving the scalar in one place keeps
// the definition (and its unit test) next to the parse.

import type { FeaFieldResult } from './types';

const NODE_ID_START = 3;
const NODE_ID_WIDTH = 10;
const VALUE_WIDTH = 12;

/** Von Mises equivalent stress from the CalculiX component order
 *  [SXX, SYY, SZZ, SXY, SYZ, SZX]. */
export function vonMisesFromTensor(c: readonly number[]): number {
  const [sxx, syy, szz, sxy, syz, szx] = c;
  const dev =
    0.5 * ((sxx - syy) ** 2 + (syy - szz) ** 2 + (szz - sxx) ** 2) +
    3 * (sxy * sxy + syz * syz + szx * szx);
  return Math.sqrt(Math.max(dev, 0));
}

/** Split one ` -1` value line into [nodeId, ...values] by fixed columns.
 *  Falls back to whitespace tokens when the columns do not parse (CalculiX
 *  switches to a wider node field on very large models). */
function parseValueLine(line: string): { node: number; values: number[] } | undefined {
  const body = line.replace(/\$\s*$/, '').replace(/\s+$/, '');
  const idText = body.slice(NODE_ID_START, NODE_ID_START + NODE_ID_WIDTH).trim();
  let node = Number(idText);
  const rest = body.slice(NODE_ID_START + NODE_ID_WIDTH);
  if (!Number.isInteger(node) || idText.length === 0) {
    const tok = body.slice(NODE_ID_START).trim().split(/\s+/);
    node = Number(tok[0]);
    if (!Number.isFinite(node)) return undefined;
    return { node, values: tok.slice(1).map(Number).filter(Number.isFinite) };
  }
  const values: number[] = [];
  for (let i = 0; i < rest.length; i += VALUE_WIDTH) {
    const field = rest.slice(i, i + VALUE_WIDTH).trim();
    if (field.length === 0) continue;
    const v = Number(field);
    if (!Number.isFinite(v)) return undefined;
    values.push(v);
  }
  return { node, values };
}

type Blocks = Map<string, Map<number, number[]>>;

function readBlocks(text: string): Blocks {
  const blocks: Blocks = new Map();
  let current: Map<number, number[]> | undefined;
  for (const line of text.split('\n')) {
    if (line.startsWith(' -4')) {
      const name = line.slice(3).trim().split(/\s+/)[0];
      current = new Map();
      blocks.set(name, current);
      continue;
    }
    if (line.startsWith(' -3')) {
      current = undefined;
      continue;
    }
    if (current === undefined) continue;
    if (!line.startsWith(' -1')) continue;
    const parsed = parseValueLine(line);
    if (parsed !== undefined) current.set(parsed.node, parsed.values);
  }
  return blocks;
}

/**
 * Parse a CalculiX .frd into per-node displacement, von Mises stress, and the
 * solver's own nodal stress-error estimate.
 *
 * Throws when the file carries no DISP block: that means the solve did not
 * complete, and returning zeros would read as a rigid, unloaded part.
 */
export function parseFrd(text: string): FeaFieldResult {
  const blocks = readBlocks(text);
  const disp = blocks.get('DISP');
  if (disp === undefined || disp.size === 0) {
    throw new Error(
      'CalculiX produced no DISP block — the solve did not complete. Check the .sta/.cvg files in the job directory.',
    );
  }
  const stress = blocks.get('STRESS');
  const err = blocks.get('ERROR');

  const nodeIds = [...disp.keys()].sort((a, b) => a - b);
  const displacement: Array<readonly [number, number, number]> = [];
  const vonMises: number[] = [];
  const stressErrorPercent: number[] = [];
  for (const id of nodeIds) {
    const d = disp.get(id)!;
    displacement.push([d[0] ?? 0, d[1] ?? 0, d[2] ?? 0]);
    const s = stress?.get(id);
    vonMises.push(s !== undefined && s.length >= 6 ? vonMisesFromTensor(s) : 0);
    const e = err?.get(id);
    if (e !== undefined && e.length >= 1) stressErrorPercent.push(e[0]);
  }
  return { nodeIds, displacement, vonMises, stressErrorPercent };
}
