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

/**
 * First sentence of the leading `//` comment. Saved rows only store the
 * latest title; an older revision's source is the title we have for it.
 */
export function revisionTitleFromSource(code: string): string | null {
  const lines: string[] = [];
  for (const line of code.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('//')) {
      lines.push(trimmed.replace(/^\/\/\s?/, ''));
      continue;
    }
    if (trimmed === '' && lines.length === 0) continue;
    break;
  }
  const text = lines.join(' ').replace(/\s+/g, ' ').trim();
  if (!text) return null;
  const sentence = text.split(/(?<=\.)\s/)[0]?.replace(/\.$/, '').trim();
  return sentence || null;
}

export interface PinnedRevision {
  version: number;
  code: string;
  parameters: ProjectRow['parameters'];
  createdAt?: string | null;
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
    title: revisionTitleFromSource(revision.code) ?? project.title,
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
