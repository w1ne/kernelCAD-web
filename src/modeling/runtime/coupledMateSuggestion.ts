// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { Assembly } from '../capture/assembly';
import { parseConnectorRef, type MateRecord } from '../mates/mate';

const SCALAR_MATE_TYPES: ReadonlySet<MateRecord['type']> = new Set(['revolute', 'prismatic']);

/**
 * The sweep moves one uncoupled mate at a time. When the two colliding parts
 * hang off sibling mates on one carrier (two gripper fingers on a palm, two
 * meshing gears on a plate), the clash may be a pose the real mechanism never
 * reaches because the mates are geared or linked together. Name the
 * `coupleMates` declaration that would make the sweep move them together.
 * Returns undefined when the pair is not on sibling mates, or the mates are
 * already coupled.
 */
export function coupledMateSuggestion(
  arm: Assembly,
  sampledMate: string | undefined,
  partA: string,
  partB: string,
): string | undefined {
  if (sampledMate === undefined) return undefined;
  const mates = arm.__mates();
  const groupOf = fastenedGroupIds(mates);
  const group = (part: string): string => groupOf.get(part) ?? part;
  const sides = (mate: MateRecord): [string, string] =>
    [group(parseConnectorRef(mate.a).partName), group(parseConnectorRef(mate.b).partName)];

  const sampled = mates.find((m) => m.name === sampledMate);
  if (sampled === undefined || !SCALAR_MATE_TYPES.has(sampled.type)) return undefined;
  const coupled = new Set(arm.__mateCouplings().flatMap((c) => [`${c.source}|${c.driven}`, `${c.driven}|${c.source}`]));
  const [gA, gB] = [group(partA), group(partB)];
  const [s0, s1] = sides(sampled);

  for (const [moved, other] of [[gA, gB], [gB, gA]] as const) {
    const carrier = s0 === moved ? s1 : s1 === moved ? s0 : undefined;
    if (carrier === undefined || carrier === other) continue;
    const sibling = mates.find((m) => {
      if (m.name === sampled.name || !SCALAR_MATE_TYPES.has(m.type)) return false;
      const [n0, n1] = sides(m);
      return (n0 === carrier && n1 === other) || (n1 === carrier && n0 === other);
    });
    if (sibling === undefined || coupled.has(`${sampled.name}|${sibling.name}`)) continue;
    return `The sweep moved '${sampled.name}' alone while '${sibling.name}' stayed put. ` +
      `If the two mates are geared or linked so they always move together, declare it: ` +
      `arm.coupleMates('${sibling.name}', { source: '${sampled.name}', ratio, offset? }) ` +
      `(driven = source × ratio + offset; ratio -1 for an equal gear pair). The sweep, solvedModel, ` +
      `animation and URDF/MJCF export then move them together. solvedModel({ ignore }) does not do this.`;
  }
  return undefined;
}

/** Part name → representative of its fastened rigid group. */
function fastenedGroupIds(mates: readonly MateRecord[]): Map<string, string> {
  const parent = new Map<string, string>();
  const find = (name: string): string => {
    if (!parent.has(name)) parent.set(name, name);
    let root = name;
    while (parent.get(root) !== root) root = parent.get(root)!;
    return root;
  };
  for (const mate of mates) {
    if (mate.type !== 'fastened') continue;
    parent.set(find(parseConnectorRef(mate.a).partName), find(parseConnectorRef(mate.b).partName));
  }
  return new Map([...parent.keys()].map((name) => [name, find(name)]));
}
