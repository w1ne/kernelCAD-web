// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Length unit of a STEP file, as a scale into kernelCAD millimetres.
// Pure text: no geometry kernel. OCCT's STEP reader applies this same
// factor when its cascade unit is millimetres, so the importer records
// the factor and does not scale the shape a second time.

/** SI prefix → metres. `$` and a missing prefix are the metre itself. */
const PREFIX_METRES: Readonly<Record<string, number>> = {
  '': 1,
  MICRO: 1e-6,
  MILLI: 1e-3,
  CENTI: 1e-2,
  DECI: 1e-1,
  DECA: 1e1,
  HECTO: 1e2,
  KILO: 1e3,
};

const NUMBER = String.raw`[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[Ee][+-]?\d+)?`;

/**
 * Millimetres per one length unit of `stepText`.
 *
 * Uses the length unit of the 3D geometric context when the file has one.
 * A file with no length unit returns 1, which is the millimetre assumption
 * the importer already uses for unitless STEP.
 */
export function stepLengthToMillimetres(stepText: string): number {
  const flat = stepText.replace(/\s+/g, ' ');
  const entities = parseEntities(flat);
  const lengthId = contextLengthUnitId(entities) ?? fallbackLengthUnitId(entities);
  if (lengthId === undefined) return 1;
  const scale = unitToMillimetres(lengthId, entities, new Set());
  return scale !== null && Number.isFinite(scale) && scale > 0 ? scale : 1;
}

/** True for a SolidWorks part or assembly path. STEP text is not read. */
export function isSolidworksNativePath(path: string): boolean {
  return /\.sld(?:prt|asm)$/i.test(path);
}

/** What to tell someone who handed us a SolidWorks file or a STEP with no solid. */
export const SOLIDWORKS_STEP_EXPORT =
  'Save as STEP AP214 or AP242 with solid bodies.';

function parseEntities(flat: string): Map<number, string> {
  const marks = [...flat.matchAll(/#(\d+)\s*=\s*/g)];
  const entities = new Map<number, string>();
  for (let i = 0; i < marks.length; i++) {
    const mark = marks[i];
    if (mark.index === undefined) continue;
    const start = mark.index + mark[0].length;
    const end = i + 1 < marks.length ? marks[i + 1].index ?? flat.length : flat.length;
    let body = flat.slice(start, end).trim();
    if (body.endsWith(';')) body = body.slice(0, -1).trim();
    entities.set(Number(mark[1]), body);
  }
  return entities;
}

function contextLengthUnitId(entities: Map<number, string>): number | undefined {
  for (const body of entities.values()) {
    if (!/GEOMETRIC_REPRESENTATION_CONTEXT\s*\(\s*3\s*\)/.test(body)) continue;
    const id = lengthUnitInContext(body, entities);
    if (id !== undefined) return id;
  }
  for (const body of entities.values()) {
    const id = lengthUnitInContext(body, entities);
    if (id !== undefined) return id;
  }
  return undefined;
}

function lengthUnitInContext(body: string, entities: Map<number, string>): number | undefined {
  const listed = body.match(/GLOBAL_UNIT_ASSIGNED_CONTEXT\s*\(\s*\(([^)]*)\)\s*\)/);
  if (!listed) return undefined;
  for (const id of entityIds(listed[1])) {
    if (/LENGTH_UNIT\s*\(/.test(entities.get(id) ?? '')) return id;
  }
  return undefined;
}

function fallbackLengthUnitId(entities: Map<number, string>): number | undefined {
  let si: number | undefined;
  for (const [id, body] of entities) {
    if (!/LENGTH_UNIT\s*\(/.test(body)) continue;
    if (/CONVERSION_BASED_UNIT\s*\(/.test(body)) return id;
    si ??= id;
  }
  return si;
}

function entityIds(list: string): number[] {
  return [...list.matchAll(/#(\d+)/g)].map((match) => Number(match[1]));
}

function unitToMillimetres(id: number, entities: Map<number, string>, seen: Set<number>): number | null {
  if (seen.has(id)) return null;
  seen.add(id);
  const body = entities.get(id);
  if (!body) return null;
  const converted = conversionToMillimetres(body, entities, seen);
  if (converted !== null) return converted;
  return siLengthToMillimetres(body);
}

function conversionToMillimetres(body: string, entities: Map<number, string>, seen: Set<number>): number | null {
  const named = body.match(/CONVERSION_BASED_UNIT\s*\(\s*'[^']*'\s*,\s*#(\d+)\s*\)/);
  if (!named) return null;
  const factor = entities.get(Number(named[1])) ?? '';
  const withUnit = factor.match(
    new RegExp(String.raw`LENGTH_MEASURE_WITH_UNIT\s*\(\s*(?:LENGTH_MEASURE\s*\(\s*)?(${NUMBER})\s*\)?\s*,\s*#(\d+)\s*\)`, 'i'),
  );
  if (withUnit) {
    const base = unitToMillimetres(Number(withUnit[2]), entities, seen);
    return base === null ? null : Number(withUnit[1]) * base;
  }
  const measure = factor.match(new RegExp(String.raw`(?:MEASURE_WITH_UNIT|LENGTH_MEASURE_WITH_UNIT)\s*\(\s*LENGTH_MEASURE\s*\(\s*(${NUMBER})\s*\)\s*,\s*#(\d+)\s*\)`, 'i'))
    ?? factor.match(new RegExp(String.raw`LENGTH_MEASURE\s*\(\s*(${NUMBER})\s*\)`, 'i'));
  if (!measure) return null;
  const baseId = measure[2] !== undefined
    ? Number(measure[2])
    : namedUnitId(body);
  if (baseId === undefined) return null;
  const base = siLengthToMillimetres(entities.get(baseId) ?? '');
  return base === null ? null : Number(measure[1]) * base;
}

function namedUnitId(body: string): number | undefined {
  const named = body.match(/NAMED_UNIT\s*\(\s*#(\d+)\s*\)/);
  return named ? Number(named[1]) : undefined;
}

/** Millimetres per one of the SI length unit written in `body`, or null. */
function siLengthToMillimetres(body: string): number | null {
  const prefixed = body.match(/SI_UNIT\s*\(\s*(?:\.([A-Z]+)\.|\$)\s*,\s*\.METRE\.\s*\)/);
  if (prefixed) {
    const prefix = prefixed[1] ?? '';
    const metres = PREFIX_METRES[prefix];
    return metres === undefined ? null : metres * 1000;
  }
  if (/SI_UNIT\s*\(\s*\.METRE\.\s*\)/.test(body)) return 1000;
  return null;
}
