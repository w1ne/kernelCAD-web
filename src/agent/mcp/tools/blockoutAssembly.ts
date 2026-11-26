// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// MCP blockout_assembly: turn a plain list of parts (bbox + placement + named
// anchors) into an evaluable placeholder assembly script.

export interface BlockoutPartInput {
  name: string;
  /** Box dimensions [x, y, z] in mm. */
  bboxMm: [number, number, number];
  /** Lower corner of the (rotated) box in assembly coordinates, mm. */
  positionMm: [number, number, number];
  /** Rotation about Z (number) or XYZ Euler degrees applied about the box lower corner before placement. */
  rotationDeg?: number | [number, number, number];
  /** Named points in assembly coordinates, mm. */
  anchors?: Array<{ name: string; positionMm: [number, number, number] }>;
}
export interface BlockoutConnectionInput { from: string; to: string }
export interface BlockoutAssemblyInput {
  name?: string;
  parts: BlockoutPartInput[];
  /** Connectivity intent between anchors, as 'part.anchor' references. */
  connections?: BlockoutConnectionInput[];
}
export interface BlockoutAssemblyOutput {
  ok: boolean;
  part_count?: number;
  connection_count?: number;
  script?: string;
  warnings: string[];
  error?: string;
}

type Vec3 = [number, number, number];

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
function vec3(v: unknown): v is Vec3 { return Array.isArray(v) && v.length === 3 && v.every(n => typeof n === 'number' && Number.isFinite(n)); }

const clean = (value: number): number => Math.abs(value) < 1e-10 ? 0 : Number(value.toFixed(10));
function rotatePoint(point: Vec3, rotation: Vec3): Vec3 {
  let [x, y, z] = point;
  const rx = rotation[0] * Math.PI / 180; [y, z] = [y * Math.cos(rx) - z * Math.sin(rx), y * Math.sin(rx) + z * Math.cos(rx)];
  const ry = rotation[1] * Math.PI / 180; [x, z] = [x * Math.cos(ry) + z * Math.sin(ry), -x * Math.sin(ry) + z * Math.cos(ry)];
  const rz = rotation[2] * Math.PI / 180; [x, y] = [x * Math.cos(rz) - y * Math.sin(rz), x * Math.sin(rz) + y * Math.cos(rz)];
  return [clean(x), clean(y), clean(z)];
}
function inverseRotatePoint(point: Vec3, rotation: Vec3): Vec3 {
  let [x, y, z] = point;
  const rz = -rotation[2] * Math.PI / 180; [x, y] = [x * Math.cos(rz) - y * Math.sin(rz), x * Math.sin(rz) + y * Math.cos(rz)];
  const ry = -rotation[1] * Math.PI / 180; [x, z] = [x * Math.cos(ry) + z * Math.sin(ry), -x * Math.sin(ry) + z * Math.cos(ry)];
  const rx = -rotation[0] * Math.PI / 180; [y, z] = [y * Math.cos(rx) - z * Math.sin(rx), y * Math.sin(rx) + z * Math.cos(rx)];
  return [clean(x), clean(y), clean(z)];
}
function uniqueName(base: string, used: Set<string>): string {
  let name = base;
  let suffix = 2;
  while (used.has(name)) name = `${base}_${suffix++}`;
  used.add(name);
  return name;
}
function safeString(v: string): string { return JSON.stringify(v); }
function safeCommentText(v: string): string {
  return v.replace(/\r\n|\r|\n|\u2028|\u2029/g, ' ').replace(/\*\//g, '* /').replace(/\/\*/g, '/ *');
}
function binding(name: string): string { return `part_${name.replace(/[^A-Za-z0-9_$]/g, '_')}`; }
function anchorName(s: string): string { return s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'anchor'; }
const COINCIDENT_ANCHOR_TOL_MM = 1e-3;
const ASSEMBLY_BINDING = 'blockoutAssembly';

interface EmittedAnchor {
  emitted: string;
  worldMm: Vec3;
  onBody: boolean;
}

interface ResolvedEndpoint {
  part: string;
  anchor: string;
  worldMm: Vec3;
  onBody: boolean;
}

function pointInBox(point: Vec3, dims: Vec3, tol = COINCIDENT_ANCHOR_TOL_MM): boolean {
  return point[0] >= -tol && point[0] <= dims[0] + tol
    && point[1] >= -tol && point[1] <= dims[1] + tol
    && point[2] >= -tol && point[2] <= dims[2] + tol;
}

function validateAnchors(anchors: unknown, label: string): string | undefined {
  if (anchors === undefined) return undefined;
  if (!Array.isArray(anchors)) return `${label}.anchors must be an array when provided.`;
  for (const [ai, anchor] of anchors.entries()) {
    if (!isRecord(anchor) || typeof anchor.name !== 'string' || !anchor.name.trim() || !vec3(anchor.positionMm)) return `${label}.anchors[${ai}] requires a name and finite positionMm [x, y, z].`;
  }
  return undefined;
}

function validateGeometry(raw: Record<string, unknown>, label: string): string | undefined {
  if (!vec3(raw.bboxMm) || raw.bboxMm.some(n => n <= 0)) return `${label}.bboxMm must contain three positive finite dimensions in mm.`;
  if (!vec3(raw.positionMm)) return `${label}.positionMm must be a finite [x, y, z] in mm.`;
  const rotation = raw.rotationDeg;
  if (rotation !== undefined && !(typeof rotation === 'number' && Number.isFinite(rotation)) && !vec3(rotation)) return `${label}.rotationDeg must be a finite number or Vec3.`;
  return undefined;
}

function validatePart(raw: unknown, index: number, names: Set<string>, bindings: Set<string>): string | undefined {
  const label = `parts[${index}]`;
  if (!isRecord(raw) || typeof raw.name !== 'string' || !raw.name.trim()) return `${label}.name must be a non-empty string.`;
  if (names.has(raw.name)) return `duplicate part name '${raw.name}'.`;
  names.add(raw.name);
  const partBinding = binding(raw.name);
  if (bindings.has(partBinding)) return `part name '${raw.name}' collides with another generated binding.`;
  bindings.add(partBinding);
  return validateGeometry(raw, label) ?? validateAnchors(raw.anchors, label);
}

function validate(input: unknown): string | undefined {
  if (!isRecord(input) || !Array.isArray(input.parts) || input.parts.length === 0) return 'parts must be a non-empty array.';
  if (input.name !== undefined && typeof input.name !== 'string') return 'name must be text when provided.';
  if (input.connections !== undefined && !Array.isArray(input.connections)) return 'connections must be an array when provided.';
  const names = new Set<string>();
  const bindings = new Set<string>([ASSEMBLY_BINDING]);
  for (const [index, raw] of input.parts.entries()) {
    const error = validatePart(raw, index, names, bindings);
    if (error) return error;
  }
  for (const [ci, conn] of ((input.connections ?? []) as unknown[]).entries()) {
    if (!isRecord(conn) || typeof conn.from !== 'string' || typeof conn.to !== 'string') return `connections[${ci}] requires from and to strings ('part.anchor').`;
  }
  return undefined;
}

interface PartTransform {
  min: Vec3;
  max: Vec3;
  shift: Vec3;
  rotateLocal: (point: Vec3) => Vec3;
  model: string;
}

function createPartTransform(dims: Vec3, rotation: Vec3): PartTransform {
  const corners: Vec3[] = [];
  for (const x of [0, dims[0]]) for (const y of [0, dims[1]]) for (const z of [0, dims[2]]) corners.push(rotatePoint([x, y, z], rotation));
  const min: Vec3 = [0, 1, 2].map(axis => Math.min(...corners.map(corner => corner[axis]))) as Vec3;
  const max: Vec3 = [0, 1, 2].map(axis => Math.max(...corners.map(corner => corner[axis]))) as Vec3;
  const shift: Vec3 = min.map(value => -value) as Vec3;
  const rotateLocal = (point: Vec3): Vec3 => {
    const rotated = rotatePoint(point, rotation);
    return [rotated[0] + shift[0], rotated[1] + shift[1], rotated[2] + shift[2]];
  };
  const rotations = [...rotation.entries()].map(([axis, degrees]) => degrees ? `.rotate([${axis === 0 ? '1, 0, 0' : axis === 1 ? '0, 1, 0' : '0, 0, 1'}], ${degrees})` : '').join('');
  const normalization = shift.some(value => Math.abs(value) > 1e-10) ? `.translate(${shift.join(', ')})` : '';
  return { min, max, shift, rotateLocal, model: `box(${dims.join(', ')})${rotations}${normalization}` };
}

const frame = (at: Vec3): string => `{ type: 'frame', origin: { kind: 'vec3', value: [${at.join(', ')}] } }`;

/** Emit one placeholder solid, its bbox anchors, and its user anchors. Returns anchor metadata lookup. */
function renderPart(part: BlockoutPartInput, lines: string[]): Map<string, EmittedAnchor> {
  const dims = part.bboxMm;
  const pos = part.positionMm;
  const rotation: Vec3 = typeof part.rotationDeg === 'number' ? [0, 0, part.rotationDeg] : part.rotationDeg ?? [0, 0, 0];
  const transform = createPartTransform(dims, rotation);
  const bindingName = binding(part.name);
  lines.push(`// ${safeCommentText(part.name)}: bbox ${dims.join(' x ')} mm placeholder solid.`);
  lines.push(`// Rotated bbox envelope: ${transform.max.map((max, axis) => max - transform.min[axis]).join(' x ')} mm; normalized so its lower corner is at local [0,0,0].`);
  lines.push(`const ${bindingName} = ${ASSEMBLY_BINDING}.part(${safeString(part.name)}, ${transform.model}, { at: [${pos.join(', ')}] });`);
  const names = new Map<string, EmittedAnchor>();
  const used = new Set<string>();
  const add = (name: string, at: Vec3, onBody: boolean): void => {
    used.add(name);
    const worldMm: Vec3 = [clean(pos[0] + at[0]), clean(pos[1] + at[1]), clean(pos[2] + at[2])];
    names.set(name, { emitted: name, worldMm, onBody });
    lines.push(`${bindingName}.connector(${safeString(name)}, ${frame(at)});`);
  };
  add('origin', [0, 0, 0], true);
  add('bbox_center', transform.rotateLocal([dims[0] / 2, dims[1] / 2, dims[2] / 2]), true);
  const faces: Array<[string, Vec3]> = [
    ['bbox_x_min', [0, dims[1] / 2, dims[2] / 2]], ['bbox_x_max', [dims[0], dims[1] / 2, dims[2] / 2]],
    ['bbox_y_min', [dims[0] / 2, 0, dims[2] / 2]], ['bbox_y_max', [dims[0] / 2, dims[1], dims[2] / 2]],
    ['bbox_z_min', [dims[0] / 2, dims[1] / 2, 0]], ['bbox_z_max', [dims[0] / 2, dims[1] / 2, dims[2]]],
  ];
  for (const [name, origin] of faces) add(name, transform.rotateLocal(origin), true);
  for (const anchor of part.anchors ?? []) {
    const localAt: Vec3 = [clean(anchor.positionMm[0] - pos[0]), clean(anchor.positionMm[1] - pos[1]), clean(anchor.positionMm[2] - pos[2])];
    const sourceLocal = inverseRotatePoint([
      localAt[0] - transform.shift[0], localAt[1] - transform.shift[1], localAt[2] - transform.shift[2],
    ], rotation);
    const emitted = uniqueName(`anchor_${anchorName(anchor.name)}`, used);
    names.set(anchor.name, { emitted, worldMm: [clean(anchor.positionMm[0]), clean(anchor.positionMm[1]), clean(anchor.positionMm[2])], onBody: pointInBox(sourceLocal, dims) });
    lines.push(`${bindingName}.connector(${safeString(emitted)}, ${frame(localAt)});`);
  }
  return names;
}

function resolveEndpoint(ref: string, anchors: Map<string, Map<string, EmittedAnchor>>): ResolvedEndpoint | undefined {
  const dot = ref.indexOf('.');
  if (dot <= 0) return undefined;
  const partName = ref.slice(0, dot);
  const anchor = anchors.get(partName)?.get(ref.slice(dot + 1));
  return anchor ? { part: partName, anchor: anchor.emitted, worldMm: anchor.worldMm, onBody: anchor.onBody } : undefined;
}

function connectionSkipReason(from: ResolvedEndpoint, to: ResolvedEndpoint, offset: Vec3, distanceMm: number): string | undefined {
  if (from.part === to.part) return 'same-part anchor reference';
  if (distanceMm > COINCIDENT_ANCHOR_TOL_MM) return `anchors are ${Number(distanceMm.toFixed(3))} mm apart, offset [${offset.join(', ')}] mm`;
  if (!from.onBody || !to.onBody) return 'anchor lies outside part solid';
  return undefined;
}

function emitConnections(
  connections: readonly BlockoutConnectionInput[],
  anchors: Map<string, Map<string, EmittedAnchor>>,
  lines: string[],
  warnings: string[],
): number {
  let connectionCount = 0;
  let fastenedCount = 0;
  let intentOnlyCount = 0;
  for (const connection of connections) {
    const from = resolveEndpoint(connection.from, anchors);
    const to = resolveEndpoint(connection.to, anchors);
    if (!from || !to) {
      warnings.push(`${connection.from} -> ${connection.to}: endpoint does not resolve to a known part.anchor; no mate was created.`);
      continue;
    }
    connectionCount++;
    const offset: Vec3 = [clean(to.worldMm[0] - from.worldMm[0]), clean(to.worldMm[1] - from.worldMm[1]), clean(to.worldMm[2] - from.worldMm[2])];
    const distanceMm = Math.hypot(offset[0], offset[1], offset[2]);
    const skipReason = connectionSkipReason(from, to, offset, distanceMm);
    if (!skipReason) {
      fastenedCount++;
      lines.push(`${ASSEMBLY_BINDING}.mate(${safeString(`connection_${connectionCount}_${anchorName(`${connection.from}_${connection.to}`)}`)}, ${safeString(`${from.part}.${from.anchor}`)}, ${safeString(`${to.part}.${to.anchor}`)}, 'fastened');`);
      continue;
    }
    intentOnlyCount++;
    lines.push(`// Connection ${connectionCount} (connectivity intent only; ${skipReason} — omitted from geometric fastened mates so positionMm placements are preserved): ${safeCommentText(from.part)}.${safeCommentText(from.anchor)} -> ${safeCommentText(to.part)}.${safeCommentText(to.anchor)}`);
  }
  if (intentOnlyCount > 0 && fastenedCount > 0) {
    warnings.push('Connections encode anchor connectivity intent only: coincident on-body anchors emit fastened mates, while non-coincident connections are recorded as comments so part positionMm placements are preserved; no wire, harness or route geometry is generated.');
  } else if (intentOnlyCount > 0) {
    warnings.push('Connections encode anchor connectivity intent only: non-coincident connections are recorded as comments rather than fastened mates so part positionMm placements are preserved; no wire, harness or route geometry is generated.');
  } else if (fastenedCount > 0) {
    warnings.push('Connections encode anchor connectivity intent only (fastened mates at coincident anchors); no wire, harness or route geometry is generated.');
  }
  return connectionCount;
}

/** Validate a parts list and emit an evaluable placeholder assembly script. positionMm is the bbox lower corner. */
export function blockoutAssemblyTool(input: BlockoutAssemblyInput): BlockoutAssemblyOutput {
  const error = validate(input);
  if (error) return { ok: false, warnings: [], error };
  const warnings: string[] = [];
  const lines = [
    `// Placeholder blockout; all dimensions are mm.`,
    '// Convention: box dimensions are corner-anchored from (0,0,0); positionMm locates that bbox corner.',
    '// Anchors: <part>.origin = bbox corner = local [0,0,0]; <part>.bbox_center = local bbox center.',
    `const ${ASSEMBLY_BINDING} = assembly(${safeString(input.name?.trim() || 'blockout')});`,
  ];
  const anchors = new Map<string, Map<string, EmittedAnchor>>();
  for (const part of input.parts) anchors.set(part.name, renderPart(part, lines));
  const connectionCount = emitConnections(input.connections ?? [], anchors, lines, warnings);
  lines.push(`return ${ASSEMBLY_BINDING}.model();`, '');
  return { ok: true, part_count: input.parts.length, connection_count: connectionCount, script: lines.join('\n'), warnings };
}
