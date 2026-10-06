// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// `/p/<slug>?version=N` must show that revision, not the latest row.

import type { ProjectRow } from '../../funnel/lib/apiClient';

/** Positive integer from `?version=`, or null when the link is unpinned. */
export function readRequestedVersion(search: string): number | null {
  const raw = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search).get('version');
  if (!raw || !/^[1-9]\d*$/.test(raw)) return null;
  const version = Number(raw);
  return Number.isSafeInteger(version) ? version : null;
}

/** Blank, a lone comment marker, or a shebang — not a title. */
function isSkippableLead(trimmed: string): boolean {
  return trimmed === ''
    || trimmed.startsWith('#!')
    || /^\/\/\s*$/.test(trimmed)
    || trimmed === '/*'
    || trimmed === '/**'
    || trimmed === '*/'
    || trimmed === '*';
}

/** Body of one leading comment line. Null when the line is source code. */
function leadingCommentBody(trimmed: string): string | null {
  if (trimmed.startsWith('//')) return trimmed.replace(/^\/\/\s?/, '').trim() || null;
  if (trimmed.startsWith('/*')) return trimmed.replace(/^\/\*+\s?/, '').replace(/\*+\/\s*$/, '').trim() || null;
  if (trimmed.startsWith('*')) return trimmed.replace(/^\*+\s?/, '').replace(/\*+\/\s*$/, '').trim() || null;
  return null;
}

/**
 * First sentence of the first meaningful leading comment line. Blank lines,
 * lone `//` markers, and shebangs are skipped. Saved rows only store the
 * latest title; an older revision's source is the title we have for it.
 */
export function revisionTitleFromSource(code: string): string | null {
  for (const line of code.split('\n')) {
    const trimmed = line.trim();
    if (isSkippableLead(trimmed)) continue;
    const body = leadingCommentBody(trimmed);
    if (!body) break;
    const sentence = body.split(/(?<=\.)\s/)[0]?.replace(/\.$/, '').trim();
    if (sentence) return sentence;
  }
  return null;
}

function nonempty(value: string | null | undefined): string | null {
  const text = value?.replace(/\s+/g, ' ').trim();
  return text ? text : null;
}

/** Title the API stored on the revision, once that column exists. */
export function revisionTitleField(body: { title?: unknown }): string | null {
  return typeof body.title === 'string' ? body.title : null;
}

/**
 * Heading for a pin: revision title, then the leading comment, then the
 * project title. Always a non-blank string.
 */
export function shareHeadingTitle(
  revisionTitle: string | null | undefined,
  code: string | null | undefined,
  projectTitle: string | null | undefined,
): string {
  return nonempty(revisionTitle)
    ?? (code ? revisionTitleFromSource(code) : null)
    ?? nonempty(projectTitle)
    ?? 'Untitled';
}

export interface PinnedRevision {
  version: number;
  code: string;
  parameters: ProjectRow['parameters'];
  createdAt?: string | null;
  /** Set when the revision API sends a title. Absent until that column ships. */
  title?: string | null;
}

/**
 * The row the share page renders. The current revision keeps its saved title.
 * An older pin uses that revision's source, code, parameters, and timestamp.
 */
export function shareProjectView(
  project: ProjectRow,
  requested: number | null,
  revision: PinnedRevision | null,
): ProjectRow {
  if (!requested || requested === project.version || !revision || revision.version !== requested) {
    return project;
  }
  return {
    ...project,
    title: shareHeadingTitle(revision.title, revision.code, project.title),
    version: revision.version,
    current_code: revision.code,
    parameters: revision.parameters,
    updated_at: revision.createdAt || project.updated_at,
  };
}

/** True when the link asks for a revision other than the one the row calls current. */
export function isHistoricalPin(project: ProjectRow, requested: number | null): boolean {
  return requested != null && requested !== project.version;
}

/**
 * The row the page may render. A historical pin that is still loading, or
 * that failed, yields null so the latest title, timestamp, and source stay
 * off the page. The shell shows a neutral heading until this returns.
 */
export function sharePageModel(
  project: ProjectRow,
  requested: number | null,
  revision: PinnedRevision | null,
  flags: { historical: boolean; pending: boolean; failed: boolean },
): ProjectRow | null {
  if (flags.failed || flags.pending) return null;
  return shareProjectView(project, flags.historical ? requested : null, revision);
}
