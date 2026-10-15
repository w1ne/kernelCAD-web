// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// MCP import_handoff: validate LabWired's v0.1 handoff and emit a placeable
// assembly script with explicit, status-aware physical assumptions.

export interface ImportHandoffInput { handoff: unknown }
export interface ImportHandoffOutput {
  ok: boolean;
  device?: string;
  part_count?: number;
  wire_mate_count?: number;
  cutout_hints?: Array<{ ref: string; feature: string; face?: string; cutout_mm: unknown }>;
  script?: string;
  warnings: string[];
  error?: string;
}

type Vec3 = [number, number, number];
type StatusValue<T> = { value: T | null; status?: string; source?: string };
type HandoffPart = {
  ref: string;
  catalog_id?: string;
  label?: string;
  mpn?: StatusValue<string> | null;
  bbox_mm?: StatusValue<Vec3> | Vec3 | null;
  position_mm?: StatusValue<number[]> | number[] | null;
  rotation_deg?: StatusValue<number> | number | null;
  physical?: {
    bbox_mm?: Vec3 | null;
    status?: string;
    mounting_holes?: Array<{ x: number; y: number; d: number }>;
    connector_faces?: Array<{ feature: string; face?: string; center_mm?: StatusValue<Vec3> | Vec3 | null; cutout_mm?: unknown }>;
    step_url?: string | null;
  } | null;
  mounting_holes?: Array<{ pos_mm?: StatusValue<number[]> | number[]; diameter_mm?: StatusValue<number> | number; x?: number; y?: number; d?: number }>;
  faces?: Array<{ feature: string; face?: string; approach?: Vec3; center_mm?: StatusValue<Vec3> | Vec3 | null; cutout_mm?: unknown }>;
  pins?: Array<{ name: string; pad?: string; pos_mm: StatusValue<number[]> | number[] | null }>;
  step?: unknown;
};
type HandoffWire = { net?: string; gauge_awg?: unknown; color?: unknown; from?: { ref?: string; pin?: string; pos_mm?: number[] | null }; to?: { ref?: string; pin?: string; pos_mm?: number[] | null } };

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
function unwrap<T>(value: StatusValue<T> | T | null | undefined): { value: T | null; status?: string } {
  if (isRecord(value) && 'value' in value) return { value: value.value as T | null, status: typeof value.status === 'string' ? value.status : undefined };
  return { value: (value ?? null) as T | null };
}
function vec3(v: unknown): v is Vec3 { return Array.isArray(v) && v.length === 3 && v.every(n => typeof n === 'number' && Number.isFinite(n)); }
function vec2(v: unknown): v is [number, number] { return Array.isArray(v) && v.length === 2 && v.every(n => typeof n === 'number' && Number.isFinite(n)); }
function malformedStatusWrapper(value: unknown): boolean {
  return isRecord(value) && 'value' in value
    && ((value.status !== undefined && typeof value.status !== 'string') || (value.source !== undefined && typeof value.source !== 'string'));
}
function rotatePoint(point: Vec3, rotation: Vec3): Vec3 {
  let [x, y, z] = point;
  const rx = rotation[0] * Math.PI / 180; [y, z] = [y * Math.cos(rx) - z * Math.sin(rx), y * Math.sin(rx) + z * Math.cos(rx)];
  const ry = rotation[1] * Math.PI / 180; [x, z] = [x * Math.cos(ry) + z * Math.sin(ry), -x * Math.sin(ry) + z * Math.cos(ry)];
  const rz = rotation[2] * Math.PI / 180; [x, y] = [x * Math.cos(rz) - y * Math.sin(rz), x * Math.sin(rz) + y * Math.cos(rz)];
  const clean = (value: number): number => Math.abs(value) < 1e-10 ? 0 : Number(value.toFixed(10));
  return [clean(x), clean(y), clean(z)];
}
function inverseRotatePoint(point: Vec3, rotation: Vec3): Vec3 {
  let [x, y, z] = point;
  const rz = -rotation[2] * Math.PI / 180; [x, y] = [x * Math.cos(rz) - y * Math.sin(rz), x * Math.sin(rz) + y * Math.cos(rz)];
  const ry = -rotation[1] * Math.PI / 180; [x, z] = [x * Math.cos(ry) + z * Math.sin(ry), -x * Math.sin(ry) + z * Math.cos(ry)];
  const rx = -rotation[0] * Math.PI / 180; [y, z] = [y * Math.cos(rx) - z * Math.sin(rx), y * Math.sin(rx) + z * Math.cos(rx)];
  const clean = (value: number): number => Math.abs(value) < 1e-10 ? 0 : Number(value.toFixed(10));
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
function binding(ref: string): string { return `part_${ref.replace(/[^A-Za-z0-9_$]/g, '_')}`; }
function anchorName(s: string): string { return s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'anchor'; }

function validateFace(face: unknown, path: string): string | undefined {
  if (!isRecord(face) || typeof face.feature !== 'string' || (face.face !== undefined && typeof face.face !== 'string')) return `${path} requires a feature name and optional face string.`;
  if (malformedStatusWrapper(face.center_mm)) return `${path}.center_mm has invalid status-wrapper metadata.`;
  const center = unwrap(face.center_mm).value;
  if (center !== null && !vec3(center)) return `${path}.center_mm must be null or a finite Vec3.`;
  return undefined;
}

function validatePartIdentity(p: unknown, index: number, refs: Set<string>, bindings: Set<string>): string | undefined {
  if (!isRecord(p) || typeof p.ref !== 'string' || !p.ref.trim()) return `parts[${index}].ref must be a non-empty string.`;
  if (refs.has(p.ref)) return `duplicate part ref '${p.ref}'.`;
  refs.add(p.ref);
  if (p.ref === 'handoffAssembly') return `part ref '${p.ref}' collides with a generated top-level identifier.`;
  const partBinding = binding(p.ref);
  if (bindings.has(partBinding)) return `part ref '${p.ref}' collides with another generated binding.`;
  bindings.add(partBinding);
  return undefined;
}

function validatePartGeometry(p: HandoffPart, index: number): string | undefined {
  const statusError = validateGeometryStatus(p, index);
  if (statusError) return statusError;
  return validateGeometryValues(p, index);
}

function validateGeometryStatus(p: HandoffPart, index: number): string | undefined {
  if (p.physical != null && !isRecord(p.physical)) return `parts[${index}].physical must be an object or null.`;
  for (const [field, value] of [['bbox_mm', p.bbox_mm], ['position_mm', p.position_mm], ['rotation_deg', p.rotation_deg]] as const) {
    if (malformedStatusWrapper(value)) return `parts[${index}].${field} has invalid status-wrapper metadata.`;
  }
  return undefined;
}

function validateGeometryValues(p: HandoffPart, index: number): string | undefined {
  const bbox = unwrap(p.bbox_mm ?? p.physical?.bbox_mm).value;
  if (bbox !== null && (!vec3(bbox) || bbox.some(n => n <= 0))) return `parts[${index}].bbox_mm must be null or contain three positive finite dimensions in mm.`;
  const position = unwrap(p.position_mm).value;
  if (position !== null && (!Array.isArray(position) || (position.length !== 2 && position.length !== 3) || !position.every(n => typeof n === 'number' && Number.isFinite(n)))) return `parts[${index}].position_mm must be null or a finite Vec2/Vec3.`;
  const rotation = unwrap(p.rotation_deg).value;
  if (rotation !== null && !(typeof rotation === 'number' && Number.isFinite(rotation)) && !vec3(rotation)) return `parts[${index}].rotation_deg must be null, a finite number, or a finite Vec3.`;
  return undefined;
}

function validatePartArrays(p: HandoffPart, index: number): string | undefined {
  for (const key of ['mounting_holes', 'faces', 'pins'] as const) {
    if (p[key] !== undefined && !Array.isArray(p[key])) return `parts[${index}].${key} must be an array when provided.`;
  }
  if (p.physical?.mounting_holes !== undefined && !Array.isArray(p.physical.mounting_holes)) return `parts[${index}].physical.mounting_holes must be an array when provided.`;
  if (p.physical?.connector_faces !== undefined && !Array.isArray(p.physical.connector_faces)) return `parts[${index}].physical.connector_faces must be an array when provided.`;
  return undefined;
}

function validatePartFaces(p: HandoffPart, index: number): string | undefined {
  for (const [fi, face] of (p.faces ?? []).entries()) {
    const error = validateFace(face, `parts[${index}].faces[${fi}]`);
    if (error) return error;
  }
  for (const [fi, face] of (p.physical?.connector_faces ?? []).entries()) {
    const error = validateFace(face, `parts[${index}].physical.connector_faces[${fi}]`);
    if (error) return error;
  }
  return undefined;
}

function validatePartHoles(p: HandoffPart, index: number): string | undefined {
  for (const [hi, hole] of (p.mounting_holes ?? []).entries()) {
    const hp = hole?.pos_mm === undefined ? [hole?.x, hole?.y] : unwrap(hole.pos_mm).value;
    const hd = hole?.diameter_mm === undefined ? hole?.d : unwrap(hole.diameter_mm).value;
    if (!vec2(hp) || typeof hd !== 'number' || !Number.isFinite(hd) || hd <= 0) return `parts[${index}].mounting_holes[${hi}] has invalid position or diameter.`;
  }
  return undefined;
}

function validatePartPins(p: HandoffPart, index: number): string | undefined {
  for (const [pi, pin] of (p.pins ?? []).entries()) {
    const pinPos = unwrap(pin?.pos_mm).value;
    const invalidPosition = pinPos !== null && (!Array.isArray(pinPos) || (pinPos.length !== 2 && pinPos.length !== 3) || !pinPos.every(n => typeof n === 'number' && Number.isFinite(n)));
    if (!pin || typeof pin.name !== 'string' || !pin.name.trim() || invalidPosition) return `parts[${index}].pins[${pi}] requires a name and finite pos_mm Vec2/Vec3 or null.`;
  }
  return undefined;
}

function validatePart(p: unknown, index: number, refs: Set<string>, bindings: Set<string>): string | undefined {
  const identityError = validatePartIdentity(p, index, refs, bindings);
  if (identityError) return identityError;
  const part = p as HandoffPart;
  return validatePartGeometry(part, index)
    ?? validatePartArrays(part, index)
    ?? validatePartFaces(part, index)
    ?? validatePartHoles(part, index)
    ?? validatePartPins(part, index);
}

function validateHandoff(h: unknown): { parts?: HandoffPart[]; error?: string } {
  if (!isRecord(h) || h.schema !== 'labwired-kernelcad-handoff/0.1') return { error: "handoff must use schema 'labwired-kernelcad-handoff/0.1'." };
  if (h.units !== 'mm') return { error: "handoff units must be 'mm'." };
  if (!Array.isArray(h.parts) || h.parts.length === 0) return { error: 'handoff.parts must be a non-empty array.' };
  if (h.wires !== undefined && !Array.isArray(h.wires)) return { error: 'handoff.wires must be an array when provided.' };
  const refs = new Set<string>();
  const bindings = new Set<string>(['handoffAssembly']);
  const parts = h.parts as HandoffPart[];
  for (const [index, part] of parts.entries()) {
    const error = validatePart(part, index, refs, bindings);
    if (error) return { error };
  }
  return { parts };
}

interface PartTransform {
  min: Vec3;
  max: Vec3;
  shift: Vec3;
  rotateLocal: (point: Vec3) => Vec3;
  model: string;
}

interface PartRenderState {
  lines: string[];
  warnings: string[];
  cutoutHints: NonNullable<ImportHandoffOutput['cutout_hints']>;
  pinAnchorNames: Map<string, Map<string, string>>;
  importedRefs: Set<string>;
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
  const rotations = [...rotation.entries()].reverse().map(([axis, degrees]) => degrees ? `.rotate([${axis === 0 ? '1, 0, 0' : axis === 1 ? '0, 1, 0' : '0, 0, 1'}], ${degrees})` : '').join('');
  const normalization = shift.some(value => Math.abs(value) > 1e-10) ? `.translate(${shift.join(', ')})` : '';
  return { min, max, shift, rotateLocal, model: `box(${dims.join(', ')})${rotations}${normalization}` };
}

function appendSolidAndBounds(ref: string, bindingName: string, dims: Vec3, pos: Vec3, transform: PartTransform, lines: string[]): Array<[string, Vec3]> {
  lines.push(`// ${safeCommentText(ref)}: bbox ${dims.join(' x ')} mm; source step is not fetched by import_handoff.`);
  lines.push(`// Rotated bbox envelope: ${transform.max.map((max, axis) => max - transform.min[axis]).join(' x ')} mm; normalized so its lower corner is at local [0,0,0].`);
  lines.push(`const ${bindingName} = handoffAssembly.part(${safeString(ref)}, ${transform.model}, { at: [${pos.join(', ')}] });`);
  lines.push(`${bindingName}.connector('origin', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });`);
  lines.push(`${bindingName}.connector('bbox_center', { type: 'frame', origin: { kind: 'vec3', value: [${transform.rotateLocal([dims[0] / 2, dims[1] / 2, dims[2] / 2]).join(', ')}] } });`);
  const faces: Array<[string, Vec3]> = [
    ['bbox_x_min', [0, dims[1] / 2, dims[2] / 2]], ['bbox_x_max', [dims[0], dims[1] / 2, dims[2] / 2]],
    ['bbox_y_min', [dims[0] / 2, 0, dims[2] / 2]], ['bbox_y_max', [dims[0] / 2, dims[1], dims[2] / 2]],
    ['bbox_z_min', [dims[0] / 2, dims[1] / 2, 0]], ['bbox_z_max', [dims[0] / 2, dims[1] / 2, dims[2]]],
  ];
  for (const [name, origin] of faces) lines.push(`${bindingName}.connector(${safeString(name)}, { type: 'frame', origin: { kind: 'vec3', value: [${transform.rotateLocal(origin).join(', ')}] } });`);
  return faces;
}

function partHoles(p: HandoffPart): NonNullable<HandoffPart['mounting_holes']> {
  return p.mounting_holes ?? p.physical?.mounting_holes?.map(hole => ({ x: hole.x, y: hole.y, d: hole.d })) ?? [];
}

function appendHoleAnchors(bindingName: string, rotation: Vec3, transform: PartTransform, holes: NonNullable<HandoffPart['mounting_holes']>, lines: string[]): void {
  const axis = rotatePoint([0, 0, 1], rotation);
  for (const [i, hole] of holes.entries()) {
    const hp: unknown = 'pos_mm' in hole && hole.pos_mm !== undefined ? unwrap(hole.pos_mm).value : [hole.x, hole.y];
    const holeDiameter: unknown = 'diameter_mm' in hole && hole.diameter_mm !== undefined ? unwrap(hole.diameter_mm).value : hole.d;
    if (!vec2(hp) || typeof holeDiameter !== 'number' || !Number.isFinite(holeDiameter) || holeDiameter <= 0) continue;
    const at = transform.rotateLocal([hp[0], hp[1], 0]);
    lines.push(`${bindingName}.connector(${safeString(`hole_${i + 1}`)}, { type: 'axis', origin: { kind: 'vec3', value: [${at.join(', ')}] }, axis: [${axis.join(', ')}] });`);
  }
}

function appendFaceAnchors(p: HandoffPart, ref: string, bindingName: string, transform: PartTransform, usedNames: Set<string>, lines: string[], cutoutHints: NonNullable<ImportHandoffOutput['cutout_hints']>): void {
  const features = [...(p.faces ?? []), ...(p.physical?.connector_faces ?? [])];
  for (const [index, face] of features.entries()) {
    const center = 'center_mm' in face ? unwrap(face.center_mm).value : null;
    if (vec3(center)) {
      const anchor = uniqueName(`face_${anchorName(face.feature || `face_${index + 1}`)}`, usedNames);
      lines.push(`${bindingName}.connector(${safeString(anchor)}, { type: 'frame', origin: { kind: 'vec3', value: [${transform.rotateLocal(center).join(', ')}] } });`);
    }
    if (face.cutout_mm != null) {
      cutoutHints.push({ ref, feature: face.feature, face: face.face, cutout_mm: face.cutout_mm });
      lines.push(`// Cut-out hint for ${safeCommentText(ref)} ${safeCommentText(face.feature)} on ${safeCommentText(face.face ?? 'unspecified face')}: ${safeString(JSON.stringify(face.cutout_mm))}; dimensions are handoff hints, not a wall cut operation.`);
    }
  }
}

function appendPinAnchors(p: HandoffPart, ref: string, pos: Vec3, rotation: Vec3, transform: PartTransform, usedNames: Set<string>, lines: string[]): Map<string, string> {
  const anchors = new Map<string, string>();
  for (const pin of p.pins ?? []) {
    const pinPos = unwrap(pin.pos_mm).value;
    if (pinPos === null || !Array.isArray(pinPos)) continue;
    const handoffPosition: Vec3 = pinPos.length === 2 ? [pinPos[0], pinPos[1], pos[2]] : [pinPos[0], pinPos[1], pinPos[2]];
    const placedTarget: Vec3 = [handoffPosition[0] - pos[0], handoffPosition[1] - pos[1], handoffPosition[2] - pos[2]];
    const sourceLocal = inverseRotatePoint([
      placedTarget[0] - transform.shift[0],
      placedTarget[1] - transform.shift[1],
      placedTarget[2] - transform.shift[2],
    ], rotation);
    const anchor = uniqueName(`pin_${anchorName(pin.name)}`, usedNames);
    anchors.set(pin.name, anchor);
    lines.push(`${binding(ref)}.connector(${safeString(anchor)}, { type: 'frame', origin: { kind: 'vec3', value: [${sourceLocal.join(', ')}] } });`);
  }
  return anchors;
}

function appendPartWarnings(p: HandoffPart, positionStatus: string | undefined, rotationStatus: string | undefined, warnings: string[]): void {
  appendGeometryWarnings(p, warnings);
  appendPlacementWarnings(p, positionStatus, rotationStatus, warnings);
  appendMetadataWarnings(p, warnings);
}

function appendGeometryWarnings(p: HandoffPart, warnings: string[]): void {
  const bboxStatus = unwrap(p.bbox_mm ?? p.physical?.bbox_mm).status ?? p.physical?.status;
  if (bboxStatus === 'estimated') warnings.push(`${p.ref}: bbox is estimated; placeholder fit is approximate.`);
  if ((p.step ?? p.physical?.step_url) == null) warnings.push(`${p.ref}: step is null; using bbox placeholder solid.`);
  if (!p.pins?.length) warnings.push(`${p.ref}: pins are missing; no pin anchors were created.`);
}

function appendPlacementWarnings(p: HandoffPart, positionStatus: string | undefined, rotationStatus: string | undefined, warnings: string[]): void {
  const statuses = [positionStatus, rotationStatus];
  if (statuses.some(status => status !== undefined && status !== 'layout' && status !== 'exact')) warnings.push(`${p.ref}: placement/rotation status is non-exact and editable.`);
}

function appendMetadataWarnings(p: HandoffPart, warnings: string[]): void {
  const physicalStatus = p.physical?.status;
  if (physicalStatus && physicalStatus !== 'exact' && physicalStatus !== 'layout') warnings.push(`${p.ref}: physical data status is '${physicalStatus}'; treat dimensions and anchors as approximate.`);
  const mpnStatus = unwrap(p.mpn).status;
  if (mpnStatus && mpnStatus !== 'exact') warnings.push(`${p.ref}: MPN status is '${mpnStatus}'; component identity is not verified.`);
}

function renderPart(p: HandoffPart, state: PartRenderState): void {
  const dims = unwrap(p.bbox_mm ?? p.physical?.bbox_mm).value;
  const positionField = unwrap(p.position_mm);
  const rotationField = unwrap(p.rotation_deg);
  if (positionField.value === null) state.warnings.push(`${p.ref}: position is null; placed at [0,0,0] as a fallback.`);
  if (rotationField.value === null) state.warnings.push(`${p.ref}: rotation is null; using [0,0,0].`);
  if (!vec3(dims)) {
    state.warnings.push(`${p.ref}: bbox is null; no placeholder solid or bbox-derived anchors were created.`);
    return;
  }
  const pos: Vec3 = positionField.value === null ? [0, 0, 0] : positionField.value.length === 2 ? [positionField.value[0], positionField.value[1], 0] : positionField.value as Vec3;
  const rotation: Vec3 = typeof rotationField.value === 'number' ? [0, 0, rotationField.value] : rotationField.value ?? [0, 0, 0];
  const transform = createPartTransform(dims, rotation);
  const partBinding = binding(p.ref);
  state.importedRefs.add(p.ref);
  const faces = appendSolidAndBounds(p.ref, partBinding, dims, pos, transform, state.lines);
  const holes = partHoles(p);
  appendHoleAnchors(partBinding, rotation, transform, holes, state.lines);
  const usedNames = new Set(['origin', 'bbox_center', ...faces.map(([name]) => name), ...holes.map((_, index) => `hole_${index + 1}`)]);
  appendFaceAnchors(p, p.ref, partBinding, transform, usedNames, state.lines, state.cutoutHints);
  state.pinAnchorNames.set(p.ref, appendPinAnchors(p, p.ref, pos, rotation, transform, usedNames, state.lines));
  appendPartWarnings(p, positionField.status, rotationField.status, state.warnings);
}

function wireEndpointAnchors(wire: HandoffWire, parts: HandoffPart[], state: PartRenderState): { fromBinding: string; toBinding: string; fromAnchor: string; toAnchor: string } | string {
  const from = wire.from!;
  const to = wire.to!;
  const fromBinding = binding(from.ref!);
  const toBinding = binding(to.ref!);
  if (!state.importedRefs.has(from.ref!) || !state.importedRefs.has(to.ref!)) return `${wire.net ?? 'wire'}: endpoint references a part without a usable solid; no fixed mate was created.`;
  const fromPin = from.pin ?? 'endpoint';
  const toPin = to.pin ?? 'endpoint';
  const fromAnchor = state.pinAnchorNames.get(from.ref!)?.get(fromPin);
  const toAnchor = state.pinAnchorNames.get(to.ref!)?.get(toPin);
  if (!fromAnchor || !toAnchor || !partHasPinPosition(parts, from.ref!, fromPin) || !partHasPinPosition(parts, to.ref!, toPin)) return `${wire.net ?? 'wire'}: endpoint pin anchor is missing; no fixed mate was created.`;
  return { fromBinding, toBinding, fromAnchor, toAnchor };
}

function partHasPinPosition(parts: HandoffPart[], ref: string, pinName: string): boolean {
  const part = parts.find(candidate => candidate.ref === ref);
  return part?.pins?.some(pin => pin.name === pinName && Array.isArray(unwrap(pin.pos_mm).value)) ?? false;
}

function appendWireMate(wire: HandoffWire, parts: HandoffPart[], state: PartRenderState, mateIndex: number): boolean {
  if (!validWireReferences(wire, state.warnings)) return false;
  const from = wire.from!;
  const to = wire.to!;
  const endpoints = wireEndpointAnchors(wire, parts, state);
  if (typeof endpoints === 'string') {
    state.warnings.push(endpoints);
    return false;
  }
  const net = wire.net ?? 'wire';
  state.lines.push(`// Endpoint connectivity intent only for ${safeString(net)}; no wire solid or route is generated.`);
  state.lines.push(`handoffAssembly.mate(${safeString(`wire_${mateIndex}_${anchorName(net)}`)}, ${safeString(`${from.ref}.${endpoints.fromAnchor}`)}, ${safeString(`${to.ref}.${endpoints.toAnchor}`)}, 'fastened');`);
  appendWireWarnings(wire, state.warnings);
  return true;
}

function validWireReferences(wire: HandoffWire, warnings: string[]): boolean {
  const from = wire?.from;
  const to = wire?.to;
  if (from && to && typeof from.ref === 'string' && from.ref.trim() && typeof to.ref === 'string' && to.ref.trim()) return true;
  warnings.push(`${wire?.net ?? 'wire'}: endpoint reference is missing or invalid; no fixed mate was created.`);
  return false;
}

function appendWireWarnings(wire: HandoffWire, warnings: string[]): void {
  for (const [field, value] of [['gauge_awg', wire.gauge_awg], ['color', wire.color]] as const) {
    if (isRecord(value) && typeof value.status === 'string' && value.status !== 'exact') warnings.push(`${wire.net ?? 'wire'}: ${field} is ${value.status}; wire routing properties are not verified.`);
  }
}

function appendWireMates(wires: HandoffWire[], parts: HandoffPart[], state: PartRenderState): number {
  if (wires.length > 0) state.warnings.push('Wire mates encode endpoint connectivity intent only; no wire geometry or routing is generated.');
  let mateIndex = 0;
  for (const wire of wires) if (appendWireMate(wire, parts, state, mateIndex + 1)) mateIndex++;
  return mateIndex;
}

function createRenderState(h: Record<string, unknown>): PartRenderState {
  const warnings: string[] = [
    'position_mm is interpreted as the bbox lower corner in the handoff frame; confirm the source anchor convention before precision fit checks.',
  ];
  if (h.board_outline === null || (isRecord(h.board_outline) && h.board_outline.value === null)) warnings.push('board_outline is null/missing; no carrier geometry was created.');
  const lines = [
    `// LabWired handoff ${safeString(String(h.device ?? 'device'))}; all dimensions are mm.`,
    '// Placeholder convention: box dimensions are corner-anchored from (0,0,0); handoff position_mm locates that bbox corner.',
    '// Anchor convention: <ref>.origin and bbox corner = local [0,0,0]; <ref>.bbox.center = local bbox center.',
    "const handoffAssembly = assembly('labwired-handoff');",
  ];
  return { lines, warnings, cutoutHints: [], pinAnchorNames: new Map(), importedRefs: new Set() };
}

function renderHandoff(h: Record<string, unknown>, parts: HandoffPart[]): ImportHandoffOutput {
  const state = createRenderState(h);
  for (const part of parts) renderPart(part, state);
  const wires = Array.isArray(h.wires) ? h.wires as HandoffWire[] : [];
  const wireMateCount = appendWireMates(wires, parts, state);
  state.lines.push('return handoffAssembly.model();', '');
  return {
    ok: true,
    device: typeof h.device === 'string' ? h.device : undefined,
    part_count: parts.length,
    wire_mate_count: wireMateCount,
    cutout_hints: state.cutoutHints,
    script: state.lines.join('\n'),
    warnings: state.warnings,
  };
}

/** Validate and create a source script. Position is the bbox lower corner; bbox.center is derived. */
export function importHandoffTool(input: ImportHandoffInput): ImportHandoffOutput {
  const validation = validateHandoff(input?.handoff);
  if (validation.error || !validation.parts) return { ok: false, warnings: [], error: validation.error };
  return renderHandoff(input.handoff as Record<string, unknown>, validation.parts);
}
