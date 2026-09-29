// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import type { SerializedParamEntry } from '../../shared/runtime/paramTable';
import type { GeometryResult } from '../../shared/worker/geometryEngine';
import type { FeatureRecord } from '../../shared/intent/featureRecord';
import type { ScriptReviewSummary } from '../context/GeometryContext';
import {
  LIVE_WINDOW_MS,
  chatLinks,
  configuredSource,
  defaultDownloadFormat,
  isLive,
  modelCheck,
  modelSizeLabel,
  posterUrl,
  projectOwnership,
  relativeTime,
  resumePrompt,
  signInHref,
  studioHref,
} from './-projectPageModel';

const NOW = Date.parse('2026-09-29T12:00:00Z');
const session = (id: string) => ({ user: { id } }) as never;

describe('projectOwnership', () => {
  it('tells anonymous, claimed, owner and someone else apart', () => {
    expect(projectOwnership({ owner_id: null }, null, false)).toBe('anonymous');
    expect(projectOwnership({ owner_id: null }, session('u1'), true)).toBe('claimed');
    expect(projectOwnership({ owner_id: 'u1' }, session('u1'), false)).toBe('owner');
    expect(projectOwnership({ owner_id: 'u1' }, session('u2'), false)).toBe('other');
    expect(projectOwnership({ owner_id: 'u1' }, null, false)).toBe('other');
  });
});

describe('isLive', () => {
  it('is live only within ten minutes of the newest revision', () => {
    expect(isLive(new Date(NOW - 60_000).toISOString(), null, NOW)).toBe(true);
    expect(isLive(new Date(NOW - LIVE_WINDOW_MS - 1).toISOString(), null, NOW)).toBe(false);
    expect(isLive('2026-01-01T00:00:00Z', new Date(NOW - 5_000), NOW)).toBe(true);
    expect(isLive(null, null, NOW)).toBe(false);
    expect(isLive('not a date', null, NOW)).toBe(false);
  });
});

describe('relativeTime', () => {
  it('reads minutes, hours and days', () => {
    expect(relativeTime(new Date(NOW - 10_000).toISOString(), NOW)).toBe('just now');
    expect(relativeTime(new Date(NOW - 5 * 60_000).toISOString(), NOW)).toBe('5 min ago');
    expect(relativeTime(new Date(NOW - 2 * 3600_000).toISOString(), NOW)).toBe('2 h ago');
    expect(relativeTime(new Date(NOW - 3 * 86400_000).toISOString(), NOW)).toBe('3 d ago');
    expect(relativeTime(undefined, NOW)).toBeNull();
  });
});

describe('modelCheck', () => {
  const validated: ScriptReviewSummary = { ok: true, diagnostics: [], validator: { status: 'solved', partCount: 1, jointCount: 0 } };

  it('reports a failed build first', () => {
    expect(modelCheck({ error: 'boom\nstack', hasGeometry: true, review: validated, interferences: 0 }))
      .toEqual({ tone: 'danger', label: 'Did not build', detail: 'boom' });
  });

  it('has no verdict before a model is built', () => {
    expect(modelCheck({ error: null, hasGeometry: false, review: null, interferences: 0 })).toBeNull();
  });

  it('says Verified only when a validator ran and passed', () => {
    expect(modelCheck({ error: null, hasGeometry: true, review: validated, interferences: 0 }))
      .toMatchObject({ tone: 'ok', label: 'Verified', detail: 'no interferences' });
    // A synthetic pass with no evidence behind it is not "Verified".
    expect(modelCheck({ error: null, hasGeometry: true, review: { ok: true, diagnostics: [] }, interferences: 0 }))
      .toMatchObject({ tone: 'neutral', label: 'Built' });
    expect(modelCheck({ error: null, hasGeometry: true, review: null, interferences: 0 }))
      .toMatchObject({ tone: 'neutral', label: 'Built' });
  });

  it('names the part count of an assembly', () => {
    const review = { ...validated, validator: { status: 'solved', partCount: 3, jointCount: 2 } };
    expect(modelCheck({ error: null, hasGeometry: true, review, interferences: 0 })?.detail).toBe('3 parts · no interferences');
  });

  it('warns about interferences and failed checks', () => {
    expect(modelCheck({ error: null, hasGeometry: true, review: validated, interferences: 2 }))
      .toMatchObject({ tone: 'warn', label: '2 interferences' });
    const failing: ScriptReviewSummary = {
      ok: false,
      diagnostics: [{ code: 'assembly.part.floating', severity: 'error', message: 'Part lid floats' }],
    };
    expect(modelCheck({ error: null, hasGeometry: true, review: failing, interferences: 0 }))
      .toEqual({ tone: 'danger', label: 'Check failed', detail: 'Part lid floats' });
    const warning: ScriptReviewSummary = {
      ok: false,
      diagnostics: [{ severity: 'warning', message: 'Thin wall' }],
    };
    expect(modelCheck({ error: null, hasGeometry: true, review: warning, interferences: 0 }))
      .toEqual({ tone: 'warn', label: '1 warning', detail: 'Thin wall' });
  });
});

function boxMesh(featureId: string, min: number[], max: number[], transform?: number[]): GeometryResult {
  const vertices = new Float32Array([...min, ...max, min[0], max[1], min[2]]);
  return {
    featureId,
    transform,
    faces: [{ vertices, indices: new Uint32Array([0, 1, 2]), normals: new Float32Array(9), faceId: 0 }],
  };
}

describe('modelSizeLabel', () => {
  it('measures the bounding box in mm', () => {
    expect(modelSizeLabel([boxMesh('a', [0, 0, 0], [60, 40, 5])])).toBe('60 × 40 × 5 mm');
    expect(modelSizeLabel([boxMesh('a', [0, 0, 0], [10.04, 2.25, 1])])).toBe('10 × 2.3 × 1 mm');
    expect(modelSizeLabel([])).toBeNull();
  });

  it('applies the assembly transform', () => {
    const shift = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 100, 0, 0, 1];
    expect(modelSizeLabel([boxMesh('a', [0, 0, 0], [10, 10, 10]), boxMesh('b', [0, 0, 0], [10, 10, 10], shift)]))
      .toBe('110 × 10 × 10 mm');
  });

  it('leaves out tool bodies a later feature consumed', () => {
    const records = [
      { id: 'box_1', kind: 'box', inputs: {} },
      { id: 'cylinder_1', kind: 'cylinder', inputs: {} },
      { id: 'boolean_1', kind: 'boolean', inputs: { target: { kind: 'feature', id: 'box_1' }, tool: { kind: 'feature', id: 'cylinder_1' } } },
    ] as unknown as FeatureRecord[];
    const meshes = [
      boxMesh('box_1', [0, 0, 0], [60, 40, 5]),
      boxMesh('cylinder_1', [22, 12, -1], [38, 28, 6]),
      boxMesh('boolean_1', [0, 0, 0], [60, 40, 5]),
    ];
    expect(modelSizeLabel(meshes)).toBe('60 × 40 × 7 mm');
    expect(modelSizeLabel(meshes, records)).toBe('60 × 40 × 5 mm');
  });
});

describe('defaultDownloadFormat', () => {
  it('is STL for one body and STEP for an assembly', () => {
    expect(defaultDownloadFormat(null)).toBe('stl');
    expect(defaultDownloadFormat({ ok: true, validator: { partCount: 1, jointCount: 0 } })).toBe('stl');
    expect(defaultDownloadFormat({ ok: true, validator: { partCount: 4, jointCount: 3 } })).toBe('step');
  });
});

describe('configuredSource', () => {
  const entries: SerializedParamEntry[] = [
    { name: 'Width', type: 'number', value: 40, defaultValue: 40, meta: { min: 10, max: 80 } },
    { name: 'HasLid', type: 'boolean', value: true, defaultValue: true },
  ];
  const code = "const w = param('Width', 40, { min: 10, max: 80 });\nconst lid = param('HasLid', true);";

  it('exports the saved source when nothing is configured', () => {
    expect(configuredSource('bracket', code, entries, [], '', 'stl'))
      .toEqual({ code, values: {}, fileName: 'bracket-default.stl' });
  });

  it('bakes the configured values from the page URL into the source', () => {
    const out = configuredSource('bracket', code, entries, [], '?p.Width=62&p.HasLid=false&view=x', 'step');
    expect(out.values).toEqual({ Width: 62, HasLid: false });
    expect(out.code).toContain("param('Width', 62");
    expect(out.code).toContain("param('HasLid', false");
    expect(out.fileName).toBe('bracket-Width62_HasLidfalse.step');
  });

  it('ignores URL values that break their declaration', () => {
    const out = configuredSource('bracket', code, entries, [], '?p.Width=500&p.Nope=1', 'stl');
    expect(out).toEqual({ code, values: {}, fileName: 'bracket-default.stl' });
  });
});

describe('continue in chat', () => {
  it('names the slug, the title and the tool that opens it', () => {
    expect(resumePrompt('pipe-clamp', 'Pipe clamp bracket'))
      .toBe('Continue kernelCAD project pipe-clamp: Pipe clamp bracket. Open it with get_project.');
    expect(resumePrompt('x', '  ')).toContain(': Untitled.');
  });

  it('prefills the prompt in chat links', () => {
    const links = chatLinks('a b&c');
    expect(links.map((l) => l.label)).toEqual(['Claude', 'ChatGPT']);
    for (const link of links) expect(link.href).toContain('q=a%20b%26c');
  });
});

describe('URLs', () => {
  it('builds the Studio, sign-in and poster URLs', () => {
    expect(studioHref('a b')).toBe('/p/a%20b?view=studio');
    expect(signInHref('abc')).toBe('/signin?next=%2Fp%2Fabc');
    expect(posterUrl('https://api.example', 'abc')).toBe('https://api.example/api/v1/projects/abc/og.png');
  });
});
