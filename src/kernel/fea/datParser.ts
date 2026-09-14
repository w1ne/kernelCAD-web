// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/fea/datParser.ts
//
// Parser for the CalculiX .dat print file. We ask the deck for one thing:
// `*NODE PRINT, NSET=<fixed>, TOTALS=ONLY` with `RF`, which prints the total
// reaction force on the held face.
//
// That single number is the cheapest available proof that the solver solved
// the problem the study POSED: the reaction must balance the applied load. A
// mismatch means the load landed on the wrong nodes or the constraint did
// not bind — both of which otherwise produce a plausible-looking,
// wrong safety factor.

import type { FeaDatResult } from './types';

const TOTAL_FORCE_RE = /total force \(fx,fy,fz\)/i;

/** Parse the reaction-force totals out of a .dat file. Returns an empty
 *  result (not a throw) when no totals block is present — the equilibrium
 *  check then simply reports as unavailable rather than failing the study. */
export function parseDat(text: string): FeaDatResult {
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (!TOTAL_FORCE_RE.test(lines[i])) continue;
    for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
      const tokens = lines[j].trim().split(/\s+/).filter(t => t.length > 0);
      if (tokens.length < 3) continue;
      const v = tokens.slice(0, 3).map(Number);
      if (v.every(Number.isFinite)) {
        return { totalReactionForce: [v[0], v[1], v[2]] };
      }
    }
  }
  return {};
}
