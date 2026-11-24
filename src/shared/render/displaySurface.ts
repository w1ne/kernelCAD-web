// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/shared/render/displaySurface.ts
//
// Shared display-surface and indicator-state contract. One definition drives
// the Node side (render_preview / capture_animation validation and image
// resolution) and the demo-player page (texture planes seated on a part face
// plus LED emissive states). Pure data + pure helpers only: imported by both
// the browser bundle and the CLI, so it must not touch three.js or Node APIs.
//
// The pose math mirrors the hosted runtime's DisplayBinding / surfaceGeometry
// contract 1:1, so a display authored for the hosted viewer lands on the same
// face, region and offset in a kernelCAD render.

export type DisplayFace = '+x' | '-x' | '+y' | '-y' | '+z' | '-z';

/** `[u0, v0, u1, v1]` in `[0, 1]` on the chosen face, `u0 < u1`, `v0 < v1`. */
export type DisplayRegion = readonly [number, number, number, number];

export type DisplayRotation = 0 | 90 | 180 | 270;

export type DisplaySurfaceMode = 'oled' | 'lcd' | 'epaper';

export interface DisplaySurfaceSpec {
  part: string;
  subMesh?: string;
  face?: DisplayFace;
  region?: DisplayRegion;
  rotation?: DisplayRotation;
  image: string;
  mode?: DisplaySurfaceMode;
  emissiveIntensity?: number;
  offsetMm?: number;
}

export interface ResolvedDisplaySurface {
  part: string;
  subMesh?: string;
  face: DisplayFace;
  region: DisplayRegion;
  rotation: DisplayRotation;
  imageDataUrl: string;
  mode: DisplaySurfaceMode;
  emissiveIntensity?: number;
  offsetMm: number;
}

export const DISPLAY_FACES = ['+x', '-x', '+y', '-y', '+z', '-z'] as const;

export const DISPLAY_ROTATIONS = [0, 90, 180, 270] as const;

export const DISPLAY_SURFACE_MODES = ['oled', 'lcd', 'epaper'] as const;

/** Plane offset off the part face (mm): flush enough to read as the glass,
 *  far enough out to beat depth fighting on coplanar imported geometry. */
export const DEFAULT_DISPLAY_OFFSET_MM = 0.035;

export const MAX_DISPLAY_SURFACES = 16;

/** Face basis: u = texture +X, v = texture +Y, n = face normal. Verbatim
 *  copy of the hosted runtime's surfaceGeometry.ts. */
export interface DisplaySurfaceAxes {
  u: [number, number, number];
  v: [number, number, number];
  n: [number, number, number];
}

export const DISPLAY_SURFACE_AXES: Record<DisplayFace, DisplaySurfaceAxes> = {
  '+z': { u: [1, 0, 0], v: [0, 1, 0], n: [0, 0, 1] },
  '-z': { u: [-1, 0, 0], v: [0, 1, 0], n: [0, 0, -1] },
  '+x': { u: [0, 1, 0], v: [0, 0, 1], n: [1, 0, 0] },
  '-x': { u: [0, -1, 0], v: [0, 0, 1], n: [-1, 0, 0] },
  '+y': { u: [-1, 0, 0], v: [0, 0, 1], n: [0, 1, 0] },
  '-y': { u: [1, 0, 0], v: [0, 0, 1], n: [0, -1, 0] },
};

export interface DisplaySurfacePose {
  position: [number, number, number];
  basis: readonly [
    [number, number, number],
    [number, number, number],
    [number, number, number],
  ];
  size: [number, number];
  normal: [number, number, number];
}

export type DisplaySurfacesValidation =
  | { ok: true; displays: DisplaySurfaceSpec[] }
  | { ok: false; message: string; hint: string };

export const DISPLAY_SURFACE_HINT =
  "Pass displays as [{ part, image, face?, region?, rotation?, mode?, emissiveIntensity?, offsetMm? }]: face is one of +x/-x/+y/-y/+z/-z (default +z), region is [u0, v0, u1, v1] in [0, 1], image is a PNG/JPEG/WebP path (script-relative) or a data: URI.";

const FULL_REGION: DisplayRegion = [0, 0, 1, 1];

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isOneOf<T extends string | number>(values: readonly T[], raw: unknown): raw is T {
  return (values as readonly unknown[]).includes(raw);
}

function isRecord(raw: unknown): raw is Record<string, unknown> {
  return typeof raw === 'object' && raw !== null && !Array.isArray(raw);
}

function readNonEmptyString(raw: unknown): string | undefined {
  return typeof raw === 'string' && raw.trim().length > 0 ? raw : undefined;
}

function validateRegion(raw: unknown): DisplayRegion | undefined {
  if (!Array.isArray(raw) || raw.length !== 4 || !raw.every(isFiniteNumber)) return undefined;
  const [u0, v0, u1, v1] = raw as [number, number, number, number];
  if (u0 < 0 || v0 < 0 || u1 > 1 || v1 > 1) return undefined;
  if (!(u0 < u1 && v0 < v1)) return undefined;
  return [u0, v0, u1, v1];
}

/** Drop keys whose value is undefined so a validated spec carries only the
 *  fields the caller actually gave. */
function withoutUndefined<T extends object>(value: T): T {
  const record = value as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (record[key] === undefined) delete record[key];
  }
  return value;
}

type FieldResult<T> = { ok: true; value: T } | { ok: false; message: string };

function requiredStringField(collection: string, index: number, field: string, raw: unknown): FieldResult<string> {
  const value = readNonEmptyString(raw);
  return value === undefined
    ? { ok: false, message: `${collection}[${index}].${field} must be a non-empty string.` }
    : { ok: true, value };
}

function optionalStringField(
  collection: string,
  index: number,
  field: string,
  raw: unknown,
): FieldResult<string | undefined> {
  if (raw === undefined) return { ok: true, value: undefined };
  const value = readNonEmptyString(raw);
  return value === undefined
    ? { ok: false, message: `${collection}[${index}].${field} must be a non-empty string when given.` }
    : { ok: true, value };
}

function enumField<T extends string | number>(
  collection: string,
  index: number,
  field: string,
  raw: unknown,
  allowed: readonly T[],
  hint: string,
): FieldResult<T | undefined> {
  if (raw === undefined) return { ok: true, value: undefined };
  if (!isOneOf(allowed, raw)) {
    return { ok: false, message: `${collection}[${index}].${field} '${String(raw)}' is invalid. ${hint}` };
  }
  return { ok: true, value: raw };
}

function rangeField(
  collection: string,
  index: number,
  field: string,
  raw: unknown,
  min: number,
  max: number,
): FieldResult<number | undefined> {
  if (raw === undefined) return { ok: true, value: undefined };
  if (!(isFiniteNumber(raw) && raw >= min && raw <= max)) {
    return { ok: false, message: `${collection}[${index}].${field} must be a finite number in [${min}, ${max}].` };
  }
  return { ok: true, value: raw };
}

function regionField(collection: string, index: number, raw: unknown): FieldResult<DisplayRegion | undefined> {
  if (raw === undefined) return { ok: true, value: undefined };
  const region = validateRegion(raw);
  return region === undefined
    ? { ok: false, message: `${collection}[${index}].region must be [u0, v0, u1, v1] in [0, 1] with u0 < u1 and v0 < v1.` }
    : { ok: true, value: region };
}

function hexColorField(collection: string, index: number, raw: unknown): FieldResult<string> {
  return typeof raw === 'string' && HEX_COLOR.test(raw)
    ? { ok: true, value: raw }
    : { ok: false, message: `${collection}[${index}].color must be a '#rrggbb' hex colour.` };
}

/** Sum of a face axis' extents along the box (unit axes → the box's width,
 *  height or depth on that face). */
function axisSpan(
  axis: readonly [number, number, number],
  extent: readonly [number, number, number],
): number {
  return Math.abs(axis[0]) * extent[0] + Math.abs(axis[1]) * extent[1] + Math.abs(axis[2]) * extent[2];
}

/**
 * Seat a display plane on one face of a part's local bounding box. The plane
 * centre sits `offsetMm` off the face, shifted by the region's centre on the
 * face; its basis is the face's u/v/n axes. Mirrors the hosted runtime's
 * surfaceGeometry.ts math verbatim.
 */
export function computeDisplaySurfacePose(
  bounds: {
    min: readonly [number, number, number];
    max: readonly [number, number, number];
  },
  opts: { face?: DisplayFace; region?: DisplayRegion; offsetMm?: number },
): DisplaySurfacePose {
  const [u0, v0, u1, v1] = opts.region ?? FULL_REGION;
  const offset = opts.offsetMm ?? DEFAULT_DISPLAY_OFFSET_MM;
  const { u, v, n } = DISPLAY_SURFACE_AXES[opts.face ?? '+z'];
  const centre: [number, number, number] = [
    (bounds.min[0] + bounds.max[0]) / 2,
    (bounds.min[1] + bounds.max[1]) / 2,
    (bounds.min[2] + bounds.max[2]) / 2,
  ];
  const extent: [number, number, number] = [
    bounds.max[0] - bounds.min[0],
    bounds.max[1] - bounds.min[1],
    bounds.max[2] - bounds.min[2],
  ];
  const width = axisSpan(u, extent);
  const height = axisSpan(v, extent);
  const depth = axisSpan(n, extent);
  const position: [number, number, number] = [0, 0, 0];
  for (let i = 0; i < 3; i += 1) {
    position[i] = centre[i]!
      + n[i]! * (depth / 2 + offset)
      + u[i]! * (((u0 + u1 - 1) * width) / 2)
      + v[i]! * (((v0 + v1 - 1) * height) / 2);
  }
  return {
    position,
    basis: [u, v, n],
    size: [width * (u1 - u0), height * (v1 - v0)],
    normal: [n[0], n[1], n[2]],
  };
}

/** Split `'part/sub-mesh'` into a part name and an optional sub-mesh name.
 *  An explicit `subMesh` wins over the slash form. */
export function parsePartAndSubMesh(part: string, subMesh?: string): {
  partName: string;
  subMeshName?: string;
} {
  const slash = part.indexOf('/');
  const partName = slash > 0 ? part.slice(0, slash) : part;
  const fromSlash = slash > 0 ? part.slice(slash + 1).trim() : '';
  const subMeshName = subMesh !== undefined && subMesh.trim().length > 0 ? subMesh : fromSlash;
  return subMeshName.length > 0 ? { partName, subMeshName } : { partName };
}

const DISPLAY_SUBMESH_PATTERNS: readonly RegExp[] = [
  /active[-_ ]?area|screen|display[-_ ]?active/i,
  /panel|epaper|oled|lcd|tft|display/i,
  /glass/i,
];

/** Best sub-mesh for a display texture: the active area first, then the panel
 *  body, then the cover glass. Undefined when no name looks like a display. */
export function pickDisplaySubMeshName(names: readonly string[]): string | undefined {
  for (const pattern of DISPLAY_SUBMESH_PATTERNS) {
    const match = names.find((name) => pattern.test(name));
    if (match !== undefined) return match;
  }
  return undefined;
}

function parseDisplaySurface(raw: unknown, index: number): DisplaySurfaceSpec | string {
  const collection = 'displays';
  if (!isRecord(raw)) return `${collection}[${index}] must be an object { part, image, ... }.`;
  const part = requiredStringField(collection, index, 'part', raw.part);
  if (!part.ok) return part.message;
  const image = requiredStringField(collection, index, 'image', raw.image);
  if (!image.ok) return image.message;
  const subMesh = optionalStringField(collection, index, 'sub_mesh', raw.sub_mesh ?? raw.subMesh);
  if (!subMesh.ok) return subMesh.message;
  const face = enumField(collection, index, 'face', raw.face, DISPLAY_FACES, `Valid faces: ${DISPLAY_FACES.join(', ')}.`);
  if (!face.ok) return face.message;
  const region = regionField(collection, index, raw.region);
  if (!region.ok) return region.message;
  const rotation = enumField(
    collection, index, 'rotation', raw.rotation, DISPLAY_ROTATIONS, `Use one of ${DISPLAY_ROTATIONS.join(', ')} degrees.`,
  );
  if (!rotation.ok) return rotation.message;
  const mode = enumField(collection, index, 'mode', raw.mode, DISPLAY_SURFACE_MODES, `Use one of ${DISPLAY_SURFACE_MODES.join(', ')}.`);
  if (!mode.ok) return mode.message;
  const emissiveIntensity = rangeField(collection, index, 'emissive_intensity', raw.emissive_intensity ?? raw.emissiveIntensity, 0, 5);
  if (!emissiveIntensity.ok) return emissiveIntensity.message;
  const offsetMm = rangeField(collection, index, 'offset_mm', raw.offset_mm ?? raw.offsetMm, 0, 5);
  if (!offsetMm.ok) return offsetMm.message;
  return withoutUndefined({
    part: part.value,
    subMesh: subMesh.value,
    face: face.value,
    region: region.value,
    rotation: rotation.value,
    image: image.value,
    mode: mode.value,
    emissiveIntensity: emissiveIntensity.value,
    offsetMm: offsetMm.value,
  });
}

/** Validate the `displays` input of a render request. `undefined` means "no
 *  display surfaces" and is valid. */
export function validateDisplaySurfaces(raw: unknown): DisplaySurfacesValidation {
  if (raw === undefined) return { ok: true, displays: [] };
  if (!Array.isArray(raw)) {
    return { ok: false, message: 'displays must be an array of display-surface objects.', hint: DISPLAY_SURFACE_HINT };
  }
  if (raw.length > MAX_DISPLAY_SURFACES) {
    return {
      ok: false,
      message: `displays has ${raw.length} entries; at most ${MAX_DISPLAY_SURFACES} are supported.`,
      hint: DISPLAY_SURFACE_HINT,
    };
  }
  const displays: DisplaySurfaceSpec[] = [];
  for (let i = 0; i < raw.length; i += 1) {
    const parsed = parseDisplaySurface(raw[i], i);
    if (typeof parsed === 'string') return { ok: false, message: parsed, hint: DISPLAY_SURFACE_HINT };
    displays.push(parsed);
  }
  return { ok: true, displays };
}

// ---- Live / simulated LED and indicator emissive states ----

export interface IndicatorStateSpec {
  part: string;
  subMesh?: string;
  /** `#rrggbb` LED colour. */
  color: string;
  /** 0 = off, 1 = full brightness (default 1). */
  level?: number;
  /** Emissive multiplier at level 1 (default DEFAULT_INDICATOR_INTENSITY). */
  intensity?: number;
}

export interface ResolvedIndicatorState {
  part: string;
  subMesh?: string;
  color: string;
  level: number;
  intensity: number;
}

export const MAX_INDICATOR_STATES = 64;

/** Emissive multiplier that reads as a lit LED under the studio rig. */
export const DEFAULT_INDICATOR_INTENSITY = 5.5;

export type IndicatorStatesValidation =
  | { ok: true; indicators: ResolvedIndicatorState[] }
  | { ok: false; message: string; hint: string };

export const INDICATOR_STATE_HINT =
  "Pass indicators as [{ part, color, level?, intensity?, subMesh? }]: color is '#rrggbb', level is 0 (off) to 1 (full), intensity is the emissive multiplier in [0, 10].";

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

function parseIndicatorState(raw: unknown, index: number): ResolvedIndicatorState | string {
  const collection = 'indicators';
  if (!isRecord(raw)) return `${collection}[${index}] must be an object { part, color, ... }.`;
  const part = requiredStringField(collection, index, 'part', raw.part);
  if (!part.ok) return part.message;
  const subMesh = optionalStringField(collection, index, 'sub_mesh', raw.sub_mesh ?? raw.subMesh);
  if (!subMesh.ok) return subMesh.message;
  const color = hexColorField(collection, index, raw.color);
  if (!color.ok) return color.message;
  const level = rangeField(collection, index, 'level', raw.level, 0, 1);
  if (!level.ok) return level.message;
  const intensity = rangeField(collection, index, 'intensity', raw.intensity, 0, 10);
  if (!intensity.ok) return intensity.message;
  return withoutUndefined({
    part: part.value,
    subMesh: subMesh.value,
    color: color.value,
    level: level.value ?? 1,
    intensity: intensity.value ?? DEFAULT_INDICATOR_INTENSITY,
  });
}

/** Validate the `indicators` input of a render request. `undefined` means
 *  "no indicator states" and is valid. */
export function validateIndicatorStates(raw: unknown): IndicatorStatesValidation {
  if (raw === undefined) return { ok: true, indicators: [] };
  if (!Array.isArray(raw)) {
    return { ok: false, message: 'indicators must be an array of indicator-state objects.', hint: INDICATOR_STATE_HINT };
  }
  if (raw.length > MAX_INDICATOR_STATES) {
    return {
      ok: false,
      message: `indicators has ${raw.length} entries; at most ${MAX_INDICATOR_STATES} are supported.`,
      hint: INDICATOR_STATE_HINT,
    };
  }
  const indicators: ResolvedIndicatorState[] = [];
  for (let i = 0; i < raw.length; i += 1) {
    const parsed = parseIndicatorState(raw[i], i);
    if (typeof parsed === 'string') return { ok: false, message: parsed, hint: INDICATOR_STATE_HINT };
    indicators.push(parsed);
  }
  return { ok: true, indicators };
}

const LED_SUBMESH = /led|lens|dome|emitter|indicator|bulb|lamp/i;
const PIN_SUBMESH = /pin|lead|leg|pad|solder|metal/i;

/** Sub-meshes that carry the light: an explicit LED/lens/dome name wins; else
 *  strip pins/leads/pads and keep the body; undefined means every mesh. */
export function pickIndicatorSubMeshNames(names: readonly string[]): string[] | undefined {
  const emitters = names.filter((name) => LED_SUBMESH.test(name));
  if (emitters.length > 0) return emitters;
  const body = names.filter((name) => !PIN_SUBMESH.test(name));
  if (body.length > 0 && body.length < names.length) return body;
  return undefined;
}

/** `[u0, v0, u1, v1]` default used by the pose helper and the page. */
export { FULL_REGION as DEFAULT_DISPLAY_REGION };
