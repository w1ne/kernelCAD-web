// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Pure logic behind the model-first /p/<slug> page: who owns the project, the
// "Live" window, the one-line check verdict, the model size, the default
// download format, the configured source of a download, and the resume prompt
// that takes the project back into the visitor's chat.

import type { Session } from '@supabase/supabase-js';
import type { ProjectRow } from '../../funnel/lib/apiClient';
import type { ScriptReviewSummary } from '../context/GeometryContext';
import type { GeometryResult } from '../../shared/worker/geometryEngine';
import type { FeatureRecord } from '../../shared/intent/featureRecord';
import type { SerializedParamEntry } from '../../shared/runtime/paramTable';
import { reviewToValidity } from '../adapters/reviewToValidity';
import {
  bakeParamValues,
  customizerParamsFrom,
  downloadFileName,
  readUrlValues,
  type CustomizerFormat,
  type CustomizerParam,
  type CustomizerParamHint,
  type CustomizerValues,
} from '../customizer/customizerParams';

/** "Live" shows while the agent pushed a revision within this window. */
export const LIVE_WINDOW_MS = 10 * 60 * 1000;

/** How the visitor relates to the project:
 *  - `anonymous`: no account owns it yet; anyone may claim it.
 *  - `claimed`: the visitor just claimed it on this page.
 *  - `owner`: the signed-in visitor owns it.
 *  - `other`: someone else owns it. */
export type ProjectOwnership = 'anonymous' | 'claimed' | 'owner' | 'other';

export function projectOwnership(
  project: Pick<ProjectRow, 'owner_id'>,
  session: Pick<Session, 'user'> | null,
  claimed: boolean,
): ProjectOwnership {
  if (claimed) return 'claimed';
  if (project.owner_id == null) return 'anonymous';
  if (session && session.user.id === project.owner_id) return 'owner';
  return 'other';
}

/** True while the newest revision (saved or pushed live) is recent. */
export function isLive(updatedAt: string | null | undefined, lastLiveUpdate: Date | null, now: number): boolean {
  const saved = updatedAt ? Date.parse(updatedAt) : Number.NaN;
  const newest = Math.max(Number.isFinite(saved) ? saved : 0, lastLiveUpdate?.getTime() ?? 0);
  return newest > 0 && now - newest >= -60_000 && now - newest < LIVE_WINDOW_MS;
}

/** "just now", "5 min ago", "2 h ago", "3 d ago", then the date. */
export function relativeTime(iso: string | null | undefined, now: number): string | null {
  const t = iso ? Date.parse(iso) : Number.NaN;
  if (!Number.isFinite(t)) return null;
  const minutes = Math.floor((now - t) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} d ago`;
  return new Date(t).toLocaleDateString();
}

// ---------------------------------------------------------------------------
// Checks
// ---------------------------------------------------------------------------

export type CheckTone = 'ok' | 'warn' | 'danger' | 'neutral';

export interface ModelCheck {
  tone: CheckTone;
  /** Badge text: "Verified", "2 warnings", "Did not build"… */
  label: string;
  /** One line after the badge. */
  detail: string;
}

export interface ModelCheckInput {
  /** The current build failed with this message. */
  error: string | null;
  /** A model is on screen. */
  hasGeometry: boolean;
  review: ScriptReviewSummary | null;
  /** Actionable interferences (contact noise excluded). */
  interferences: number;
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

function firstLine(text: string): string {
  return (text.split('\n')[0] ?? text).trim();
}

/**
 * One verdict for the side panel, from the review the viewer already holds.
 * "Verified" only when a validator really ran and passed with no
 * interferences: a review with no evidence behind it reads "Built".
 * Null while nothing is built yet.
 */
export function modelCheck({ error, hasGeometry, review, interferences }: ModelCheckInput): ModelCheck | null {
  if (error) return { tone: 'danger', label: 'Did not build', detail: firstLine(error) };
  if (!hasGeometry) return null;
  if (interferences > 0) {
    return { tone: 'warn', label: plural(interferences, 'interference'), detail: 'Parts overlap. Open in Studio to see where.' };
  }
  const validity = review ? reviewToValidity(review) : null;
  if (!validity || !validity.validated) {
    return { tone: 'neutral', label: 'Built', detail: 'The model builds. No checks ran on it yet.' };
  }
  const errors = validity.diagnostics.filter((d) => d.severity === 'error');
  if (validity.status === 'error' || errors.length > 0) {
    const first = errors[0]?.message;
    return { tone: 'danger', label: 'Check failed', detail: first ? firstLine(first) : 'A check failed. Open in Studio for details.' };
  }
  const warnings = validity.diagnostics.filter((d) => d.severity === 'warning');
  if (validity.status === 'warning' || warnings.length > 0) {
    return { tone: 'warn', label: plural(Math.max(warnings.length, 1), 'warning'), detail: firstLine(warnings[0]?.message ?? 'Open in Studio for details.') };
  }
  const parts = validity.partCount > 1 ? `${validity.partCount} parts · ` : '';
  return { tone: 'ok', label: 'Verified', detail: `${parts}no interferences` };
}

// ---------------------------------------------------------------------------
// Size
// ---------------------------------------------------------------------------

type Vec3 = [number, number, number];

function transformPoint(m: readonly number[] | undefined, x: number, y: number, z: number): Vec3 {
  if (!m || m.length !== 16) return [x, y, z];
  // Column-major 4x4.
  return [
    m[0] * x + m[4] * y + m[8] * z + m[12],
    m[1] * x + m[5] * y + m[9] * z + m[13],
    m[2] * x + m[6] * y + m[10] * z + m[14],
  ];
}

function formatMm(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

/** Ids of features another feature takes as input (the box and the
 *  cylinder of a subtract): tool bodies, not part of the result. */
function consumedFeatureIds(records: readonly FeatureRecord[]): Set<string> {
  const ids = new Set<string>();
  for (const record of records) {
    for (const ref of Object.values(record.inputs ?? {})) {
      if (ref.kind === 'feature') ids.add(ref.id);
      else if ('featureId' in ref && typeof ref.featureId === 'string') ids.add(ref.featureId);
    }
  }
  return ids;
}

/** The result bodies: meshes of features no other feature consumed. */
function resultBodies(geometries: readonly GeometryResult[], records: readonly FeatureRecord[]): readonly GeometryResult[] {
  const consumed = consumedFeatureIds(records);
  if (consumed.size === 0) return geometries;
  const results = geometries.filter((g) => !g.featureId || !consumed.has(g.featureId));
  return results.length > 0 ? results : geometries;
}

/** Bounding-box size of the model, e.g. "60 × 40 × 5 mm". Tool bodies that a
 *  later feature consumed do not count. */
export function modelSizeLabel(
  geometries: readonly GeometryResult[],
  records: readonly FeatureRecord[] = [],
): string | null {
  const min: Vec3 = [Infinity, Infinity, Infinity];
  const max: Vec3 = [-Infinity, -Infinity, -Infinity];
  for (const g of resultBodies(geometries, records)) {
    for (const face of g.faces) {
      const v = face.vertices;
      for (let i = 0; i + 2 < v.length; i += 3) {
        const p = transformPoint(g.transform, v[i], v[i + 1], v[i + 2]);
        for (let k = 0; k < 3; k++) {
          if (p[k] < min[k]) min[k] = p[k];
          if (p[k] > max[k]) max[k] = p[k];
        }
      }
    }
  }
  if (!Number.isFinite(min[0])) return null;
  return `${[0, 1, 2].map((k) => formatMm(max[k] - min[k])).join(' × ')} mm`;
}

// ---------------------------------------------------------------------------
// Download
// ---------------------------------------------------------------------------

export const FORMAT_LABELS: Record<CustomizerFormat, string> = { stl: 'STL', '3mf': '3MF', step: 'STEP' };

/** What each format is for, shown under the menu entry. */
export const FORMAT_HINTS: Record<CustomizerFormat, string> = {
  stl: 'Mesh for 3D printing',
  '3mf': 'Mesh with units, for slicers',
  step: 'Exact solid for CAD tools',
};

/** STL for a single printable body; STEP for assemblies. */
export function defaultDownloadFormat(review: ScriptReviewSummary | null): CustomizerFormat {
  const validator = review?.validator;
  const assembly = (validator?.partCount ?? 0) > 1 || (validator?.jointCount ?? 0) > 0;
  return assembly ? 'step' : 'stl';
}

export interface ConfiguredSource {
  code: string;
  /** The configured values that differ from the saved source. */
  values: CustomizerValues;
  fileName: string;
}

/**
 * The source to export: the saved code with the customizer's values baked
 * in. The customizer mirrors every changed value into the page URL
 * (`?p.<name>=`), so the URL is where the configuration lives; values that
 * fail their declaration are ignored, as they are by the customizer.
 */
export function configuredSource(
  slug: string,
  code: string,
  entries: readonly SerializedParamEntry[],
  hints: readonly CustomizerParamHint[] | undefined,
  search: string,
  format: CustomizerFormat,
): ConfiguredSource {
  const params = customizerParamsFrom(entries, hints);
  const { values } = readUrlValues(search, params);
  const changed = Object.keys(values).length > 0;
  // Every URL value is a change from the saved source (the customizer drops
  // defaults from the URL), so name each one in the file name.
  const named: CustomizerParam[] = params
    .filter((param) => param.name in values)
    .map((param) => ({ ...param, defaultValue: Number.NaN }));
  return {
    code: changed ? bakeParamValues(code, values) : code,
    values,
    fileName: downloadFileName(slug, named, values, format),
  };
}

// ---------------------------------------------------------------------------
// Continue in chat
// ---------------------------------------------------------------------------

/** The prompt a visitor pastes into their agent to continue this project. */
export function resumePrompt(slug: string, title: string): string {
  const name = title.trim() || 'Untitled';
  return `Continue kernelCAD project ${slug}: ${name}. Open it with get_project.`;
}

export interface ChatLink {
  label: string;
  href: string;
}

/** Chat apps that accept a prefilled prompt in the URL. */
export function chatLinks(prompt: string): ChatLink[] {
  const q = encodeURIComponent(prompt);
  return [
    { label: 'Claude', href: `https://claude.ai/new?q=${q}` },
    { label: 'ChatGPT', href: `https://chatgpt.com/?q=${q}` },
  ];
}

// ---------------------------------------------------------------------------
// URLs
// ---------------------------------------------------------------------------

/** Query value of `?view=` that opens the full Studio workbench. */
export const STUDIO_VIEW = 'studio';

export function studioHref(slug: string): string {
  return `/p/${encodeURIComponent(slug)}?view=${STUDIO_VIEW}`;
}

export function modelPageHref(slug: string): string {
  return `/p/${encodeURIComponent(slug)}`;
}

/** The sign-in page, returning to this project. */
export function signInHref(slug: string): string {
  return `/signin?next=${encodeURIComponent(modelPageHref(slug))}`;
}

/** Stored render of a public project; 404 for private ones or before the
 *  first capture. */
export function posterUrl(apiBase: string, slug: string): string {
  return `${apiBase}/api/v1/projects/${encodeURIComponent(slug)}/og.png`;
}
