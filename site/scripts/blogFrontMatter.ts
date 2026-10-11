// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Front matter of a docs/guide/*.md page. A page with front matter is a blog
// post; a page without it is a plain guide and the blog build skips it.
//
//   ---
//   title: Bent tubes between ports           required, text
//   summary: One sentence for the index.     required, text
//   date: 2026-10-11                         required, YYYY-MM-DD
//   kind: guide                              required, use-case | guide
//   status: draft                            optional, draft | published (default)
//   model: examples/x/y.kcad.ts              optional on a guide; required on a published use-case
//   video: docs/demos/x/demo.mp4             optional on a guide; required on a published use-case
//   note: Text for reviewers.                optional, never shown on a published page
//   ---
//
// `model` and `video` are paths from the repository root. Any other key is an
// error, so a misspelt field fails instead of being ignored.

import { parse } from 'yaml';

export const BLOG_KINDS = ['use-case', 'guide'] as const;
export const BLOG_STATUSES = ['draft', 'published'] as const;

export type BlogKind = (typeof BLOG_KINDS)[number];
export type BlogStatus = (typeof BLOG_STATUSES)[number];

export interface BlogFrontMatter {
  readonly title: string;
  readonly summary: string;
  /** `YYYY-MM-DD`. */
  readonly date: string;
  readonly kind: BlogKind;
  /** `published` when the page does not say. */
  readonly status: BlogStatus;
  /** Repository path of the model the post is about. */
  readonly model?: string;
  /** Repository path of the post's video. */
  readonly video?: string;
  /** For the people reviewing a draft. Never rendered on a published page. */
  readonly note?: string;
}

export interface ParsedGuide {
  readonly meta: BlogFrontMatter;
  /** Everything after the closing `---`. */
  readonly body: string;
  /** 1-based line of the file on which `body` starts. */
  readonly bodyLine: number;
  /** 1-based file line of each top-level front matter key. */
  readonly fieldLines: Readonly<Record<string, number>>;
}

const REQUIRED = ['title', 'summary', 'date', 'kind'] as const;
const OPTIONAL = ['status', 'model', 'video', 'note'] as const;
const ALLOWED: readonly string[] = [...REQUIRED, ...OPTIONAL];

/** A front matter problem, with the file and (when there is one) the field. */
export class FrontMatterError extends Error {
  readonly file: string;
  readonly field: string | null;

  constructor(file: string, field: string | null, detail: string) {
    super(`${file}: ${detail}`);
    this.name = 'FrontMatterError';
    this.file = file;
    this.field = field;
  }
}

const FENCE = /^---\s*$/;

/**
 * Splits off and validates the front matter. Returns null when the page has
 * none. Throws `FrontMatterError` when it has front matter that is not a valid
 * blog post description.
 */
export function parseGuide(file: string, source: string): ParsedGuide | null {
  const lines = source.split('\n');
  if (!FENCE.test(lines[0] ?? '')) return null;
  const close = lines.findIndex((line, i) => i > 0 && FENCE.test(line));
  if (close === -1) {
    throw new FrontMatterError(file, null, 'front matter starts on line 1 but has no closing --- line');
  }
  const raw = readYaml(file, lines.slice(1, close).join('\n'));
  const fieldLines: Record<string, number> = {};
  lines.slice(1, close).forEach((line, i) => {
    const key = /^([A-Za-z_][\w-]*)\s*:/.exec(line);
    if (key) fieldLines[key[1]] = i + 2;
  });
  return {
    meta: validate(file, raw),
    body: lines.slice(close + 1).join('\n'),
    bodyLine: close + 2,
    fieldLines,
  };
}

function readYaml(file: string, text: string): Record<string, unknown> {
  let value: unknown;
  try {
    value = parse(text);
  } catch (err) {
    const reason = err instanceof Error ? err.message.split('\n')[0] : String(err);
    throw new FrontMatterError(file, null, `front matter is not valid YAML: ${reason}`);
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new FrontMatterError(file, null, 'front matter must be a list of key: value lines');
  }
  return value as Record<string, unknown>;
}

function validate(file: string, raw: Record<string, unknown>): BlogFrontMatter {
  for (const key of Object.keys(raw)) {
    if (!ALLOWED.includes(key)) {
      throw new FrontMatterError(file, key, `front matter has an unknown key "${key}" (allowed: ${ALLOWED.join(', ')})`);
    }
  }
  for (const field of REQUIRED) {
    if (raw[field] === undefined || raw[field] === null) {
      throw new FrontMatterError(file, field, `front matter is missing "${field}"`);
    }
  }

  const text = (field: string): string | undefined => {
    const value = raw[field];
    if (value === undefined) return undefined;
    if (typeof value !== 'string' || value.trim() === '') {
      throw new FrontMatterError(file, field, `"${field}" must be non-empty text`);
    }
    return value.trim();
  };
  const oneOf = <T extends string>(field: string, allowed: readonly T[], fallback?: T): T => {
    const value = raw[field] ?? fallback;
    if (!allowed.includes(value as T)) {
      throw new FrontMatterError(file, field, `"${field}" must be ${allowed.join(' or ')}, not "${String(value)}"`);
    }
    return value as T;
  };

  const meta: BlogFrontMatter = {
    title: text('title')!,
    summary: text('summary')!,
    date: isoDate(file, raw.date),
    kind: oneOf('kind', BLOG_KINDS),
    status: oneOf('status', BLOG_STATUSES, 'published'),
    ...optional('model', text('model')),
    ...optional('video', text('video')),
    ...optional('note', text('note')),
  };

  if (meta.kind === 'use-case' && meta.status === 'published') {
    for (const field of ['model', 'video'] as const) {
      if (meta[field] === undefined) {
        throw new FrontMatterError(file, field, `a published use-case needs "${field}" (or status: draft)`);
      }
    }
  }
  return meta;
}

function optional<K extends string>(key: K, value: string | undefined): Partial<Record<K, string>> {
  return value === undefined ? {} : ({ [key]: value } as Record<K, string>);
}

function isoDate(file: string, value: unknown): string {
  const text = String(value);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  const day = match ? new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))) : null;
  if (!day || day.toISOString().slice(0, 10) !== text) {
    throw new FrontMatterError(file, 'date', `"date" must be a real day written YYYY-MM-DD, not "${text}"`);
  }
  return text;
}
