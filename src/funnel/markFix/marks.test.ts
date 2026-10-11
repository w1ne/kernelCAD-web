// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import {
  addStroke,
  buildMarksMessage,
  cleanText,
  downsample,
  MAX_STROKE_POINTS,
  MAX_STROKES,
  normalizePick,
  paintRegions,
  readWidgetHello,
  summarizeStroke,
  type EditPick,
  type PaintHit,
} from './marks';

const PICK: EditPick = {
  featureId: 'sedan-side-L',
  partName: 'sedan-side-L',
  faceId: 12,
  surface: 'plane',
  point: [12.3456, -4.001, 88.999],
  normal: [0, 0, 2],
};

describe('normalizePick', () => {
  it('rounds the point to 0.01 mm and makes the normal unit length', () => {
    expect(normalizePick(PICK)).toEqual({
      featureId: 'sedan-side-L',
      partName: 'sedan-side-L',
      faceId: 12,
      surface: 'plane',
      point: [12.35, -4, 89],
      normal: [0, 0, 1],
    });
  });

  it('rejects non-finite points and zero normals', () => {
    expect(normalizePick({ ...PICK, point: [Number.NaN, 0, 0] })).toBeNull();
    expect(normalizePick({ ...PICK, point: [Infinity, 0, 0] })).toBeNull();
    expect(normalizePick({ ...PICK, normal: [0, 0, 0] })).toBeNull();
  });

  it('drops bad ids and an unknown surface becomes other', () => {
    const out = normalizePick({
      ...PICK,
      featureId: '   ',
      faceId: -1,
      surface: 'torus' as unknown as EditPick['surface'],
    });
    expect(out?.featureId).toBeUndefined();
    expect(out?.faceId).toBeUndefined();
    expect(out?.surface).toBe('other');
  });

  it('keeps a cylinder radius only on cylinders', () => {
    expect(normalizePick({ ...PICK, surface: 'cylinder', radiusMm: 4.004 })?.radiusMm).toBe(4);
    expect(normalizePick({ ...PICK, surface: 'plane', radiusMm: 4 })?.radiusMm).toBeUndefined();
  });
});

describe('cleanText', () => {
  it('flattens whitespace and control characters', () => {
    expect(cleanText('  a\tb\r\n\u0007c  ', 10)).toBe('a b c');
    expect(cleanText('abcdef', 3)).toBe('abc');
  });
});

function hit(x: number, faceId: number, extra: Partial<PaintHit> = {}): PaintHit {
  return {
    featureId: faceId === 7 ? 'body' : 'roof',
    faceId,
    surface: 'plane',
    point: [x, 0, 10],
    normal: [0, 0, 1],
    screen: [x / 100, 0.5],
    brushMm: 2,
    shapeIndex: 0,
    ...extra,
  };
}

describe('readWidgetHello', () => {
  const base = { source: 'kernelcad-widget', type: 'kernelcad.widget-hello', instanceId: 'i1' };
  it('returns the feature list for this instance', () => {
    expect(readWidgetHello({ ...base, features: ['edit-request', 'marks-context', 3] }, 'i1')).toEqual(['edit-request', 'marks-context']);
    expect(readWidgetHello({ ...base, features: [] }, 'i1')).toEqual([]);
  });
  it('is null for another instance or a non-hello', () => {
    expect(readWidgetHello({ ...base, features: ['marks-context'] }, 'other')).toBeNull();
    expect(readWidgetHello({ ...base, type: 'x', features: [] }, 'i1')).toBeNull();
    expect(readWidgetHello({ ...base }, 'i1')).toBeNull();
  });
});

describe('strokes', () => {
  it('keeps the newest MAX_STROKES strokes', () => {
    let list: number[] = [];
    for (let i = 0; i < MAX_STROKES + 2; i += 1) list = addStroke(list, i);
    expect(list).toEqual([2, 3, 4, 5, 6]);
  });

  it('downsamples evenly, keeping both ends', () => {
    const many = Array.from({ length: 100 }, (_, i) => i);
    const out = downsample(many, 5);
    expect(out).toEqual([0, 25, 50, 74, 99]);
    expect(downsample([1, 2], 5)).toEqual([1, 2]);
  });

  it('summarizes a stroke: the hit nearest its centre, its path, screen path and features', () => {
    const hits = Array.from({ length: 60 }, (_, i) => hit(i, i < 40 ? 12 : 7));
    const s = summarizeStroke(hits)!;
    expect(s.pick.point[0]).toBeCloseTo(29, 0);
    expect(s.summary.points).toHaveLength(MAX_STROKE_POINTS);
    expect(s.summary.screen).toHaveLength(MAX_STROKE_POINTS);
    expect(s.summary.screen[0]).toEqual([0, 0.5]);
    expect(s.summary.features).toEqual(['roof', 'body']);
    expect(s.pick).not.toHaveProperty('brushMm');
    expect(summarizeStroke([hit(Number.NaN, 1)])).toBeNull();
  });
});

describe('paintRegions', () => {
  it('lists touched faces by share, with coverage from brush x path over the face area', () => {
    // 40 samples 1 mm apart on face 12, 20 on face 7; brush 2 mm: (2 + 39 x 1) x 2 = 82 mm^2 of 200.
    const stroke = [...Array.from({ length: 40 }, (_, i) => hit(i, 12)), ...Array.from({ length: 20 }, (_, i) => hit(40 + i, 7))];
    const regions = paintRegions([stroke], (_s, faceId) => (faceId === 12 ? 200 : null));
    expect(regions).toHaveLength(2);
    expect(regions[0]).toEqual({ featureId: 'roof', faceId: 12, surface: 'plane', share: 0.67, coverage: 0.41 });
    expect(regions[1]).toMatchObject({ featureId: 'body', faceId: 7, share: 0.33, coverage: null });
  });

  it('clamps coverage to 1', () => {
    const regions = paintRegions([Array.from({ length: 10 }, (_, i) => hit(i * 10, 12))], () => 1);
    expect(regions[0]!.coverage).toBe(1);
  });
});

describe('buildMarksMessage', () => {
  const camera = { projection: 'perspective' as const, position: [100.04, 0, 50] as [number, number, number], direction: [0, 0, -2] as [number, number, number], up: [0, 1, 0] as [number, number, number], fovDeg: 45 };

  it('carries strokes, regions, bounds, camera and viewport, and no note', () => {
    const m = buildMarksMessage({
      seq: 3, slug: 'sedan', revision: 2, instanceId: 'i1',
      strokes: [[hit(1, 12), hit(2, 12)]],
      faceArea: () => 100,
      camera,
      viewport: { width: 390.4, height: 520 },
    });
    expect(m).toMatchObject({
      source: 'kernelcad-embed', type: 'kernelcad.marks', v: 1, seq: 3, slug: 'sedan', revision: 2, instanceId: 'i1',
      picks: [{ featureId: 'roof', faceId: 12, surface: 'plane', normal: [0, 0, 1] }],
      strokes: [{ points: [[1, 0, 10], [2, 0, 10]], screen: [[0.01, 0.5], [0.02, 0.5]], features: ['roof'] }],
      regions: [{ featureId: 'roof', faceId: 12, share: 1, coverage: 0.06 }],
      bbox: { min: [1, 0, 10], max: [2, 0, 10] },
      camera: { projection: 'perspective', position: [100, 0, 50], direction: [0, 0, -1], up: [0, 1, 0], fovDeg: 45 },
      viewport: { width: 390, height: 520 },
    });
    expect(m).not.toHaveProperty('note');
  });

  it('clamps to MAX_STROKES and an empty list carries nothing else', () => {
    const many = Array.from({ length: 9 }, (_, i) => [hit(i, 12)]);
    expect(buildMarksMessage({ seq: 1, slug: 's', revision: null, instanceId: 'i', strokes: many }).picks).toHaveLength(MAX_STROKES);
    const shot = 'data:image/jpeg;base64,QUJD';
    const empty = buildMarksMessage({ seq: 1, slug: 's', revision: 0, instanceId: 'i', strokes: [], screenshot: shot, camera });
    expect(empty).toEqual({
      source: 'kernelcad-embed', type: 'kernelcad.marks', v: 1, seq: 1, slug: 's', revision: null, instanceId: 'i',
      picks: [], strokes: [], regions: [], bbox: null,
    });
    const withShot = buildMarksMessage({ seq: 1, slug: 's', revision: 0, instanceId: 'i', strokes: [[hit(1, 1)]], screenshot: shot });
    expect(withShot.screenshot).toBe(shot);
    expect(buildMarksMessage({ seq: 1, slug: 's', revision: 0, instanceId: 'i', strokes: [[hit(1, 1)]], screenshot: 'data:image/png;base64,QQ' })).not.toHaveProperty('screenshot');
  });
});
