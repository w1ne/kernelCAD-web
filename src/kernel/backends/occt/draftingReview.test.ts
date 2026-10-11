// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct, OcctBackend } from './occtBackend';
import { renderSvgDrawing, type SvgDrawingOptions } from './exportSvgDrawing';

beforeAll(initOcct);
const decode = (bytes: Uint8Array) => new TextDecoder().decode(bytes);
function plate(xs = [10, 70]) {
  let shape = OcctBackend.box(80, 50, 10);
  for (const x of xs) for (const y of [10, 40]) shape = shape.subtract(OcctBackend.cylinder(14, 3).translate(x, y, -2));
  return [{ name: 'plate', shape }];
}
function draw(extra: Record<string, unknown> = {}, xs?: number[]) {
  return renderSvgDrawing(plate(xs), { format: 'svg-drawing', autoAnnotate: true, ...extra } as SvgDrawingOptions);
}

describe('drafting annotation review', () => {
  it('gives every automatic annotation a stable unique ID shared with SVG', () => {
    const a = draw(), b = draw({ sheet: 'a3' });
    const ids = a.report!.annotations.map(row => row.id);
    expect(ids.every(id => typeof id === 'string' && id.length > 0)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
    expect(b.report!.annotations.map(row => row.id).sort()).toEqual([...ids].sort());
    for (const row of a.report!.annotations) {
      expect(row.source).toBe('auto');
      expect(decode(a.bytes)).toContain(`data-kc-annotation-id="${row.id}"`);
    }
  });

  it('suppresses a selected annotation but retains its review row', () => {
    const base = draw();
    const row = base.report!.annotations.find(a => a.kind === 'hole')!;
    const edited = draw({ annotationOverrides: { [row.id]: { suppress: true } } });
    expect(edited.report!.annotations.find(a => a.id === row.id)?.suppressed).toBe(true);
    expect(edited.report!.suppressed).toBe(1);
    expect(edited.report!.placed + edited.report!.overlapped).toBe(base.report!.annotations.length - 1);
    expect(decode(edited.bytes)).not.toContain(`data-kc-annotation-id="${row.id}"`);
  });

  it('edits primary hole text, view and leader offset while keeping its position frame', () => {
    const base = draw();
    const row = base.report!.annotations.find(a => a.kind === 'hole')!;
    const edited = draw({ annotationOverrides: { [row.id]: { text: 'DRILL ON FIXTURE', view: 'front', offset: 6 } } });
    const review = edited.report!.annotations.find(a => a.id === row.id)!;
    expect(review.view).toBe('front');
    expect(review.originalText).toBe(row.text);
    expect(review.text).toContain('DRILL ON FIXTURE');
    expect(decode(edited.bytes)).toContain('>DRILL ON FIXTURE</text>');
    expect(decode(edited.bytes)).toContain('data-kc-fcf="⌖ ⌀0.1 A B C"');
    expect(decode(edited.bytes)).not.toBe(decode(base.bytes));
  });

  it('anchors a reassigned hole leader on its projected rim', () => {
    const row = draw().report!.annotations.find(a => a.kind === 'hole')!;
    const svg = decode(draw({ annotationOverrides: { [row.id]: { view: 'front' } } }).bytes);
    const front = svg.match(/<g id="view-front"[\s\S]*?<g class="visible"[^>]*><path d="([^"]*)"/)![1];
    const coordinates = [...front.matchAll(/[-\d.]+/g)].map(m => Number(m[0]));
    const top = Math.min(...coordinates.filter((_, i) => i % 2 === 1));
    const group = svg.slice(svg.indexOf(`data-kc-annotation-id="${row.id}"`));
    const anchorY = Number(group.match(/<line x1="[-\d.]+" y1="([-\d.]+)"/)![1]);
    expect(anchorY).toBeCloseTo(top, 3);
  });

  it('warns when an override refers to a missing annotation', () => {
    const edited = draw({ annotationOverrides: { 'auto:missing': { suppress: true } } });
    expect(edited.diagnostics.some(d => d.message.includes('auto:missing'))).toBe(true);
  });

  it('rejects non-finite offsets and invalid views', () => {
    expect(() => draw({ annotationOverrides: { x: { offset: Infinity } } })).toThrow(/offset/);
    expect(() => draw({ annotationOverrides: { x: { view: 'rear' } } })).toThrow(/view/);
  });

  it('can review authored notes with explicit IDs', () => {
    const authored = { kind: 'note', id: 'finish', at: [0, 0, 10], text: 'BREAK EDGES', view: 'front' };
    const result = draw({ autoAnnotate: false, annotations: [authored], annotationOverrides: { 'authored:finish': { text: 'DEBURR', offset: 4 } } });
    expect(result.report!.annotations[0]).toMatchObject({ id: 'authored:finish', source: 'authored', text: 'DEBURR', originalText: 'BREAK EDGES' });
    expect(decode(result.bytes)).toContain('>DEBURR</text>');
  });

  it('reports computed authored dimension labels before and after a text edit', () => {
    const options = { autoAnnotate: false, annotations: [{ id: 'width', kind: 'linear', from: [0, 0, 10], to: [80, 0, 10] }] };
    const original = draw(options);
    expect(original.report!.annotations[0].text).toBe('80');
    const edited = draw({ ...options, annotationOverrides: { 'authored:width': { text: 'WIDTH 80' } } });
    expect(edited.report!.annotations[0].originalText).toBe('80');
  });

  it('retains FCF text in suppressed edited hole review rows', () => {
    const base = draw();
    const row = base.report!.annotations.find(a => a.kind === 'hole')!;
    const edited = draw({ annotationOverrides: { [row.id]: { suppress: true, text: 'DRILL' } } });
    expect(edited.report!.annotations.find(a => a.id === row.id)!.text).toBe('DRILL | ⌖ ⌀0.1 A B C');
  });

  it('rejects a view that collapses an overall measurement', () => {
    expect(() => draw({ annotationOverrides: { 'auto:overall:x': { view: 'left' } } })).toThrow(/true length/);
  });

  it('rejects a review view that collapses an authored linear measurement', () => {
    const annotations = [{ id: 'width', kind: 'linear', from: [0, 0, 10], to: [80, 0, 10] }];
    expect(() => draw({ autoAnnotate: false, annotations, annotationOverrides: { 'authored:width': { view: 'left' } } }))
      .toThrow(/authored:width.*left.*collaps/i);
    const valid = draw({ autoAnnotate: false, annotations, annotationOverrides: { 'authored:width': { view: 'top' } } });
    expect(valid.report!.annotations[0]).toMatchObject({ view: 'top', text: '80' });
  });

  it('rejects an authored view override that foreshortens the intended measurement', () => {
    const annotations = [{ id: 'width', kind: 'linear', from: [0, 0, 10], to: [80, 0, 10] }];
    expect(() => draw({ autoAnnotate: false, annotations, annotationOverrides: { 'authored:width': { view: 'iso' } } }))
      .toThrow(/authored:width.*iso.*measurement/i);
  });

  it('preserves an authored diagonal measurement from its original view', () => {
    const annotations = [{ id: 'diagonal', kind: 'linear', from: [0, 0, 10], to: [80, 20, 10], view: 'front' }];
    const valid = draw({ autoAnnotate: false, annotations, annotationOverrides: { 'authored:diagonal': { view: 'top' } } });
    expect(valid.report!.annotations[0].text).toBe('80');
    expect(() => draw({ autoAnnotate: false, annotations, annotationOverrides: { 'authored:diagonal': { view: 'left' } } }))
      .toThrow(/authored:diagonal.*left.*measurement/i);
  });

  it('rejects an authored angular view override that changes the intended angle', () => {
    const annotations = [{ id: 'corner', kind: 'angular', view: 'front',
      from: { ofCurveType: 'LINE', near: [40, 0, 0], within: { yMin: -0.1, yMax: 0.1, zMin: -0.1, zMax: 0.1 } },
      to: { ofCurveType: 'LINE', near: [0, 0, 5], within: { xMin: -0.1, xMax: 0.1, yMin: -0.1, yMax: 0.1 } } }];
    expect(draw({ autoAnnotate: false, annotations }).report!.annotations[0].text).toBe('90°');
    expect(() => draw({ autoAnnotate: false, annotations, annotationOverrides: { 'authored:corner': { view: 'iso' } } }))
      .toThrow(/authored:corner.*iso.*angle/i);
  });

  it('preserves authored linear tolerance suffixes under a review text override', () => {
    const annotations = [{ id: 'width', kind: 'linear', from: [0, 0, 10], to: [80, 0, 10], tol: { plus: 0.1, minus: 0.1 } }];
    const base = draw({ autoAnnotate: false, annotations });
    expect(base.report!.annotations[0]).toMatchObject({ text: '80 +0.1/−0.1', primaryText: '80' });
    const result = draw({ autoAnnotate: false, annotations, annotationOverrides: { 'authored:width': { text: 'VERIFY WIDTH' } } });
    expect(result.report!.annotations[0]).toMatchObject({ text: 'VERIFY WIDTH +0.1/−0.1', primaryText: 'VERIFY WIDTH' });
    expect(decode(result.bytes)).toContain('>VERIFY WIDTH +0.1/−0.1</text>');
    const legacyText = draw({ autoAnnotate: false, annotations: [{ ...annotations[0], text: 'SOURCE LABEL' }] });
    expect(legacyText.report!.annotations[0].text).toBe('SOURCE LABEL');
  });

  it('does not transfer a hole override to changed geometry', () => {
    const original = draw();
    const row = original.report!.annotations.find(a => a.kind === 'hole')!;
    const changed = draw({ annotationOverrides: { [row.id]: { suppress: true } } }, [10, 60]);
    expect(changed.report!.suppressed).toBe(0);
    expect(changed.diagnostics.some(d => d.code === 'drawing.annotation.override-missing')).toBe(true);
  });
});

describe('manufacturing dimension strategies and profiles', () => {
  it('chains successive hole locations from the datum', () => {
    const result = draw({ autoAnnotate: { include: ['hole-positions'], dimensioningStyle: 'chain' } }, [10, 30, 70]);
    expect(result.report!.annotations.filter(a => a.kind === 'hole-position').map(a => a.text).sort()).toEqual(['10', '10', '20', '30', '40']);
  });

  it('dimensions mirrored hole locations from a visible center cue', () => {
    const result = draw({ autoAnnotate: { include: ['hole-positions'], dimensioningStyle: 'symmetry' } });
    expect(result.report!.annotations.filter(a => a.kind === 'hole-position').map(a => a.text).sort()).toEqual(['2× 15', '2× 30']);
    expect(decode(result.bytes)).toContain('data-kc-centerline=');
  });

  it('falls back to baseline for a non-mirrored axis', () => {
    const result = draw({ autoAnnotate: { include: ['hole-positions'], dimensioningStyle: 'symmetry' } }, [10, 30]);
    expect(result.report!.annotations.filter(a => a.kind === 'hole-position').map(a => a.text).sort()).toEqual(['10', '2× 15', '30']);
  });

  it('uses a named machining profile and lets explicit annotation options win', () => {
    const result = draw({ draftingProfile: 'machining', autoAnnotate: { include: ['overall'] } });
    expect(result.report!.annotations).toHaveLength(3);
    expect(result.report!.draftingProfile).toBe('machining');
    expect(() => draw({ draftingProfile: 'unlisted' })).toThrow(/draftingProfile/);
  });

  it('fills omitted custom profile settings from general defaults', () => {
    const result = draw({ draftingProfile: { id: 'shop', name: 'Shop review' } });
    expect(result.report!.draftingProfile).toBe('shop');
    expect(result.report!.annotations.filter(a => a.kind === 'hole-position').map(a => a.text).sort()).toEqual(['10', '10', '40', '70']);
    expect(decode(result.bytes)).toContain('width="297mm"');
  });

  it('places the symmetry center cue on a reviewed measurement view', () => {
    const options = { autoAnnotate: { include: ['hole-positions'], dimensioningStyle: 'symmetry' } };
    const base = draw(options);
    const x = base.report!.annotations.find(a => a.text === '2× 30')!;
    const result = draw({ ...options, annotationOverrides: { [x.id]: { view: 'front' } } });
    expect(decode(result.bytes)).toContain('data-kc-centerline="front:0"');
  });
});
