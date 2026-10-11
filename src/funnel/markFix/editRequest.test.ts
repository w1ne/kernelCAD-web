// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import {
  addPick,
  buildEditRequest,
  cleanText,
  isWidgetHello,
  MAX_NOTE_CHARS,
  MAX_PICKS,
  MAX_SCREENSHOT_CHARS,
  normalizePick,
  pickLabel,
  readWidgetAck,
  removePick,
  sendBlocker,
  type EditPick,
} from './editRequest';

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

describe('pins', () => {
  it('stops at five pins and removes by index', () => {
    let picks: EditPick[] = [];
    for (let i = 0; i < MAX_PICKS + 2; i++) picks = addPick(picks, { ...PICK, point: [i, 0, 0] });
    expect(picks).toHaveLength(MAX_PICKS);
    picks = removePick(picks, 1);
    expect(picks.map((p) => p.point[0])).toEqual([0, 2, 3, 4]);
  });

  it('labels a pin by feature, then part, then surface', () => {
    expect(pickLabel(PICK)).toBe('sedan-side-L');
    expect(pickLabel({ ...PICK, featureId: undefined, partName: 'wheel' })).toBe('wheel');
    expect(pickLabel({ surface: 'cylinder', point: [0, 0, 0], normal: [0, 0, 1] })).toBe('cylinder face');
  });
});

describe('sendBlocker', () => {
  it('needs the model shown, a pin and a note', () => {
    expect(sendBlocker({ displayed: false, picks: [PICK], note: 'x' })).toMatch(/load/);
    expect(sendBlocker({ displayed: true, picks: [], note: 'x' })).toMatch(/pin/);
    expect(sendBlocker({ displayed: true, picks: [PICK], note: '  \n ' })).toMatch(/change/);
    expect(sendBlocker({ displayed: true, picks: [PICK], note: 'smoother' })).toBeNull();
  });
});

describe('buildEditRequest', () => {
  const base = {
    requestId: 'r1',
    slug: 'sedan',
    revision: 7,
    instanceId: 'inst-1',
    note: 'make this smoother',
    picks: [PICK],
  };

  it('builds the v1 message', () => {
    const msg = buildEditRequest(base);
    expect(msg).toMatchObject({
      source: 'kernelcad-embed',
      type: 'kernelcad.edit-request',
      v: 1,
      requestId: 'r1',
      slug: 'sedan',
      revision: 7,
      instanceId: 'inst-1',
      note: 'make this smoother',
    });
    expect(msg.picks[0]?.point).toEqual([12.35, -4, 89]);
    expect(msg.screenshot).toBeUndefined();
  });

  it('clamps the note, the pins and an unknown revision', () => {
    const msg = buildEditRequest({
      ...base,
      revision: undefined,
      note: `a\u0000b\n${'x'.repeat(MAX_NOTE_CHARS + 50)}`,
      picks: Array.from({ length: 8 }, (_, i) => ({ ...PICK, point: [i, 0, 0] as [number, number, number] })),
    });
    expect(msg.revision).toBeNull();
    expect(msg.note.length).toBeLessThanOrEqual(MAX_NOTE_CHARS);
    expect(msg.note.startsWith('a b x')).toBe(true);
    expect(msg.picks).toHaveLength(MAX_PICKS);
  });

  it('keeps a small JPEG screenshot and drops anything else', () => {
    const jpeg = 'data:image/jpeg;base64,AAAA';
    expect(buildEditRequest({ ...base, screenshot: jpeg }).screenshot).toBe(jpeg);
    expect(buildEditRequest({ ...base, screenshot: 'data:image/png;base64,AAAA' }).screenshot).toBeUndefined();
    const huge = `data:image/jpeg;base64,${'A'.repeat(MAX_SCREENSHOT_CHARS)}`;
    expect(buildEditRequest({ ...base, screenshot: huge }).screenshot).toBeUndefined();
  });

  it('is small without a screenshot', () => {
    const picks = Array.from({ length: MAX_PICKS }, () => PICK);
    const json = JSON.stringify(buildEditRequest({ ...base, picks, note: 'x'.repeat(MAX_NOTE_CHARS) }));
    expect(json.length).toBeLessThan(2_000);
  });
});

describe('widget messages', () => {
  it('accepts a hello only for this instance with edit-request support', () => {
    const hello = { source: 'kernelcad-widget', type: 'kernelcad.widget-hello', instanceId: 'i', features: ['edit-request'] };
    expect(isWidgetHello(hello, 'i')).toBe(true);
    expect(isWidgetHello(hello, 'other')).toBe(false);
    expect(isWidgetHello({ ...hello, features: [] }, 'i')).toBe(false);
    expect(isWidgetHello({ ...hello, source: 'x' }, 'i')).toBe(false);
    expect(isWidgetHello(null, 'i')).toBe(false);
  });

  it('reads an ack for this instance', () => {
    const ack = { source: 'kernelcad-widget', type: 'kernelcad.edit-request-ack', instanceId: 'i', requestId: 'r', ok: true };
    expect(readWidgetAck(ack, 'i')).toEqual({ requestId: 'r', ok: true });
    expect(readWidgetAck({ ...ack, ok: false, error: 'rejected' }, 'i')).toEqual({ requestId: 'r', ok: false, error: 'rejected' });
    expect(readWidgetAck(ack, 'other')).toBeNull();
    expect(readWidgetAck({ ...ack, requestId: 3 }, 'i')).toBeNull();
  });
});

describe('cleanText', () => {
  it('flattens whitespace and control characters', () => {
    expect(cleanText('  a\tb\r\n\u0007c  ', 10)).toBe('a b c');
    expect(cleanText('abcdef', 3)).toBe('abc');
  });
});
