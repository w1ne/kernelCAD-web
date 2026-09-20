// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/mcp/edits/shapeDraft.test.ts
//
// Characterisation of `shapeDraftEdit`: exact validation error strings and
// exact inserted source for every option combination, pinned before the
// complexity split so the refactor stays byte-identical.

import { describe, expect, it } from 'vitest';
import { shapeDraftEdit } from './shapeDraft';

const CODE = [
  "const body = box(10, 10, 10);",
  'const _drafted_2 = body.draft(1, { face: "top" });',
  'return _drafted_2;',
].join('\n');

function base(overrides: Partial<Parameters<typeof shapeDraftEdit>[0]> = {}) {
  return { code: CODE, shape_binding: '_drafted_2', angle_deg: 5, face: 'top', ...overrides };
}

describe('shapeDraftEdit validation', () => {
  it('rejects a non-identifier shape_binding', () => {
    expect(shapeDraftEdit(base({ shape_binding: '1bad name' }))).toEqual({
      ok: false,
      error: 'shape_draft: shape_binding must be a valid JS identifier; got "1bad name".',
    });
  });

  it('rejects a binding that is not declared in the source', () => {
    expect(shapeDraftEdit(base({ shape_binding: 'missing' }))).toEqual({
      ok: false,
      error: 'shape_draft: binding "missing" is not declared in the source.',
    });
  });

  it('rejects a non-finite, negative, or out-of-range angle', () => {
    expect(shapeDraftEdit(base({ angle_deg: Number.NaN }))).toEqual({
      ok: false,
      error: 'shape_draft: angle_deg must be a finite number in [0, 90]; got null.',
    });
    expect(shapeDraftEdit(base({ angle_deg: -1 }))).toEqual({
      ok: false,
      error: 'shape_draft: angle_deg must be a finite number in [0, 90]; got -1.',
    });
    expect(shapeDraftEdit(base({ angle_deg: 90.5 }))).toEqual({
      ok: false,
      error: 'shape_draft: angle_deg must be a finite number in [0, 90]; got 90.5.',
    });
  });

  it('rejects an empty face selector', () => {
    expect(shapeDraftEdit(base({ face: '' }))).toEqual({
      ok: false,
      error: 'shape_draft: face must be a non-empty string (canonical name, label, or FaceQuery descriptor).',
    });
  });

  it('rejects a malformed pull_dir', () => {
    expect(shapeDraftEdit(base({ pull_dir: [1, 2] as [number, number, number] }))).toEqual({
      ok: false,
      error: 'shape_draft: pull_dir must be a [number, number, number] triple; got [1,2].',
    });
    expect(shapeDraftEdit(base({ pull_dir: [1, 2, Number.NaN] }))).toEqual({
      ok: false,
      error: 'shape_draft: pull_dir must be a [number, number, number] triple; got [1,2,null].',
    });
  });

  it('surfaces the addFeature failure when there is no top-level return', () => {
    expect(shapeDraftEdit({ code: 'const body = box(1, 1, 1);', shape_binding: 'body', angle_deg: 3, face: 'top' })).toEqual({
      ok: false,
      error: 'no return statement found at top level — cannot place new feature.',
    });
  });
});

describe('shapeDraftEdit emission', () => {
  it('derives the next _drafted_N binding and inserts the statement before the return', () => {
    const r = shapeDraftEdit({ code: 'const a = box(1, 1, 1);\nreturn a;', shape_binding: 'a', angle_deg: 5, face: 'top' });
    expect(r).toEqual({
      ok: true,
      new_code: [
        'const a = box(1, 1, 1);',
        'const _drafted_1 = a.draft(5, { face: "top" });',
        'return a;',
      ].join('\n'),
    });
  });

  it('keeps existing options in face, neutral_plane, pull_dir order', () => {
    const r = shapeDraftEdit(base({
      angle_deg: 0,
      face: 'FaceQuery.descriptor',
      neutral_plane: 'bottom',
      pull_dir: [0, 0, -1],
      binding_name: 'draftedBody',
    }));
    expect(r).toEqual({
      ok: true,
      new_code: [
        "const body = box(10, 10, 10);",
        'const _drafted_2 = body.draft(1, { face: "top" });',
        'const draftedBody = _drafted_2.draft(0, { face: "FaceQuery.descriptor", neutralPlane: "bottom", pullDir: [0,0,-1] });',
        'return _drafted_2;',
      ].join('\n'),
    });
  });
});
