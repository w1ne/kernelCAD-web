// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/**
 * "Mark & fix" wire protocol between the embed (inside the ChatGPT widget's
 * iframe) and the widget that hosts it. Pure functions only: the overlay and
 * the host channel build on these, and the tests pin them.
 *
 * embed -> widget  `kernelcad.edit-request`      the user's pins + note
 * widget -> embed  `kernelcad.widget-hello`      the widget can take edit requests
 * widget -> embed  `kernelcad.edit-request-ack`  the request reached the chat (or not)
 *
 * The embed shows "Mark & fix" only after a hello for its own instance, so a
 * widget that predates this protocol never gets a button that goes nowhere.
 */

export const EDIT_REQUEST_VERSION = 1;
export const MAX_PICKS = 5;
export const MAX_NOTE_CHARS = 500;
/** Longest feature / part id kept; real ids are short script names. */
export const MAX_ID_CHARS = 120;
/** Base64 data-URL budget for the optional screenshot (~150 KB of JPEG). */
export const MAX_SCREENSHOT_CHARS = 200_000;

export type SurfaceKind = 'plane' | 'cylinder' | 'other';
export type Vec3 = [number, number, number];

/** One tapped spot on the model. Points are world mm, normals unit length. */
export interface EditPick {
  featureId?: string;
  partName?: string;
  faceId?: number;
  surface: SurfaceKind;
  /** Cylinder radius in mm, when the face is a cylinder. */
  radiusMm?: number;
  point: Vec3;
  normal: Vec3;
}

export interface EditRequestMessage {
  source: 'kernelcad-embed';
  type: 'kernelcad.edit-request';
  v: typeof EDIT_REQUEST_VERSION;
  requestId: string;
  slug: string;
  revision: number | null;
  instanceId: string;
  note: string;
  picks: EditPick[];
  screenshot?: string;
}

export interface WidgetAck {
  requestId: string;
  ok: boolean;
  error?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Strip control characters and collapse runs of whitespace. */
export function cleanText(value: string, max: number): string {
  // eslint-disable-next-line no-control-regex
  const flat = value.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim();
  return flat.length > max ? flat.slice(0, max).trimEnd() : flat;
}

function round(n: number, digits: number): number {
  const f = 10 ** digits;
  const r = Math.round(n * f) / f;
  return Object.is(r, -0) ? 0 : r;
}

function finiteVec3(value: unknown): value is Vec3 {
  return Array.isArray(value) && value.length === 3
    && value.every((n) => typeof n === 'number' && Number.isFinite(n));
}

/** Unit normal rounded to 3 decimals, or null for a zero / non-finite vector. */
function unitNormal(n: Vec3): Vec3 | null {
  const len = Math.hypot(n[0], n[1], n[2]);
  if (!Number.isFinite(len) || len < 1e-9) return null;
  return [round(n[0] / len, 3), round(n[1] / len, 3), round(n[2] / len, 3)];
}

function optionalId(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const id = cleanText(value, MAX_ID_CHARS);
  return id.length > 0 ? id : undefined;
}

/** A pick with finite numbers, rounded for a small payload; null when unusable. */
export function normalizePick(pick: EditPick): EditPick | null {
  if (!finiteVec3(pick.point) || !finiteVec3(pick.normal)) return null;
  const normal = unitNormal(pick.normal);
  if (!normal) return null;
  const out: EditPick = {
    surface: pick.surface === 'plane' || pick.surface === 'cylinder' ? pick.surface : 'other',
    point: [round(pick.point[0], 2), round(pick.point[1], 2), round(pick.point[2], 2)],
    normal,
  };
  const featureId = optionalId(pick.featureId);
  const partName = optionalId(pick.partName);
  if (featureId) out.featureId = featureId;
  if (partName) out.partName = partName;
  if (typeof pick.faceId === 'number' && Number.isInteger(pick.faceId) && pick.faceId >= 0) out.faceId = pick.faceId;
  if (out.surface === 'cylinder' && typeof pick.radiusMm === 'number' && Number.isFinite(pick.radiusMm) && pick.radiusMm > 0) {
    out.radiusMm = round(pick.radiusMm, 2);
  }
  return out;
}

/** Add a pick unless the list is full. */
export function addPick(picks: readonly EditPick[], pick: EditPick): EditPick[] {
  const clean = normalizePick(pick);
  if (!clean || picks.length >= MAX_PICKS) return [...picks];
  return [...picks, clean];
}

export function removePick(picks: readonly EditPick[], index: number): EditPick[] {
  return picks.filter((_, i) => i !== index);
}

/** Why Send is not available yet, or null when it is. */
export function sendBlocker(args: { displayed: boolean; picks: readonly EditPick[]; note: string }): string | null {
  if (!args.displayed) return 'Wait for the model to load.';
  if (args.picks.length === 0) return 'Tap the model to drop a pin.';
  if (cleanText(args.note, MAX_NOTE_CHARS).length === 0) return 'Say what to change.';
  return null;
}

export function newRequestId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  return `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** The message posted to the widget. Clamps the note, the pin count and the screenshot. */
export function buildEditRequest(args: {
  requestId: string;
  slug: string;
  revision: number | null | undefined;
  instanceId: string;
  note: string;
  picks: readonly EditPick[];
  screenshot?: string | null;
}): EditRequestMessage {
  const picks = args.picks
    .slice(0, MAX_PICKS)
    .map(normalizePick)
    .filter((p): p is EditPick => p !== null);
  const revision = typeof args.revision === 'number' && Number.isInteger(args.revision) && args.revision > 0
    ? args.revision
    : null;
  const message: EditRequestMessage = {
    source: 'kernelcad-embed',
    type: 'kernelcad.edit-request',
    v: EDIT_REQUEST_VERSION,
    requestId: args.requestId,
    slug: args.slug,
    revision,
    instanceId: args.instanceId,
    note: cleanText(args.note, MAX_NOTE_CHARS),
    picks,
  };
  const shot = args.screenshot;
  if (typeof shot === 'string' && shot.startsWith('data:image/jpeg;base64,') && shot.length <= MAX_SCREENSHOT_CHARS) {
    message.screenshot = shot;
  }
  return message;
}

/** A widget hello for this instance that offers edit requests. */
export function isWidgetHello(data: unknown, instanceId: string): boolean {
  if (!isRecord(data) || data.source !== 'kernelcad-widget' || data.type !== 'kernelcad.widget-hello') return false;
  if (data.instanceId !== instanceId) return false;
  return Array.isArray(data.features) && data.features.includes('edit-request');
}

/** The widget's answer to one of this instance's edit requests, or null. */
export function readWidgetAck(data: unknown, instanceId: string): WidgetAck | null {
  if (!isRecord(data) || data.source !== 'kernelcad-widget' || data.type !== 'kernelcad.edit-request-ack') return null;
  if (data.instanceId !== instanceId || typeof data.requestId !== 'string') return null;
  const ack: WidgetAck = { requestId: data.requestId, ok: data.ok === true };
  if (typeof data.error === 'string') ack.error = cleanText(data.error, 200);
  return ack;
}

/** Short label for a pin chip: the feature, else the part, else the surface. */
export function pickLabel(pick: EditPick): string {
  return pick.featureId ?? pick.partName ?? `${pick.surface} face`;
}
