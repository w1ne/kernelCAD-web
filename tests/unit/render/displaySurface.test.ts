// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// tests/unit/render/displaySurface.test.ts
//
// Shared display-surface / indicator contract: input validation, face pose
// math (all six faces, sub-regions, custom offset), part/sub-mesh parsing and
// the display / indicator sub-mesh name pickers.
import { describe, it, expect } from 'vitest';
import {
  DEFAULT_DISPLAY_OFFSET_MM,
  DEFAULT_INDICATOR_INTENSITY,
  DISPLAY_FACES,
  DISPLAY_SURFACE_AXES,
  MAX_DISPLAY_SURFACES,
  MAX_INDICATOR_STATES,
  computeDisplaySurfacePose,
  parsePartAndSubMesh,
  pickDisplaySubMeshName,
  pickIndicatorSubMeshNames,
  validateDisplaySurfaces,
  validateIndicatorStates,
  type DisplayFace,
} from '../../../src/shared/render/displaySurface';

const BOX = { min: [-5, -4, -3] as const, max: [5, 4, 3] as const };
const FACE_POSE: Record<DisplayFace, { position: [number, number, number]; size: [number, number] }> = {
  '+z': { position: [0, 0, 3 + DEFAULT_DISPLAY_OFFSET_MM], size: [10, 8] },
  '-z': { position: [0, 0, -3 - DEFAULT_DISPLAY_OFFSET_MM], size: [10, 8] },
  '+x': { position: [5 + DEFAULT_DISPLAY_OFFSET_MM, 0, 0], size: [8, 6] },
  '-x': { position: [-5 - DEFAULT_DISPLAY_OFFSET_MM, 0, 0], size: [8, 6] },
  '+y': { position: [0, 4 + DEFAULT_DISPLAY_OFFSET_MM, 0], size: [10, 6] },
  '-y': { position: [0, -4 - DEFAULT_DISPLAY_OFFSET_MM, 0], size: [10, 6] },
};

describe('validateDisplaySurfaces', () => {
  it('accepts undefined and an empty list as "no display surfaces"', () => {
    expect(validateDisplaySurfaces(undefined)).toEqual({ ok: true, displays: [] });
    expect(validateDisplaySurfaces([])).toEqual({ ok: true, displays: [] });
  });

  it('accepts a minimal spec and every optional field', () => {
    const minimal = validateDisplaySurfaces([{ part: 'oled', image: 'screen.png' }]);
    expect(minimal).toEqual({ ok: true, displays: [{ part: 'oled', image: 'screen.png' }] });

    const full = validateDisplaySurfaces([{
      part: 'oled',
      subMesh: 'active-area',
      face: '+y',
      region: [0.1, 0.2, 0.9, 0.8],
      rotation: 90,
      image: 'screen.png',
      mode: 'lcd',
      emissiveIntensity: 0.8,
      offsetMm: 0.2,
    }]);
    expect(full.ok).toBe(true);
    if (!full.ok) return;
    expect(full.displays[0]).toMatchObject({
      part: 'oled', subMesh: 'active-area', face: '+y', rotation: 90, mode: 'lcd', offsetMm: 0.2,
    });
    expect(full.displays[0]!.region).toEqual([0.1, 0.2, 0.9, 0.8]);
  });

  it('refuses every malformed field with a message and hint', () => {
    const bad: unknown[] = [
      'not-an-array',
      [{ part: '', image: 'a.png' }],
      [{ part: 'oled', image: '   ' }],
      [{ part: 'oled', image: 'a.png', subMesh: '' }],
      [{ part: 'oled', image: 'a.png', face: 'up' }],
      [{ part: 'oled', image: 'a.png', region: [0.9, 0.2, 0.1, 0.8] }],
      [{ part: 'oled', image: 'a.png', region: [-0.1, 0, 1, 1] }],
      [{ part: 'oled', image: 'a.png', region: [0, 0, 1.1, 1] }],
      [{ part: 'oled', image: 'a.png', region: [0, 0, 1] }],
      [{ part: 'oled', image: 'a.png', region: [0, 0, 1, Number.NaN] }],
      [{ part: 'oled', image: 'a.png', rotation: 45 }],
      [{ part: 'oled', image: 'a.png', mode: 'crt' }],
      [{ part: 'oled', image: 'a.png', emissiveIntensity: -1 }],
      [{ part: 'oled', image: 'a.png', emissiveIntensity: 6 }],
      [{ part: 'oled', image: 'a.png', offsetMm: -0.1 }],
      [{ part: 'oled', image: 'a.png', offsetMm: 6 }],
    ];
    for (const input of bad) {
      const result = validateDisplaySurfaces(input);
      expect(result.ok, JSON.stringify(input)).toBe(false);
      if (result.ok) continue;
      expect(result.message.length).toBeGreaterThan(0);
      expect(result.hint.length).toBeGreaterThan(0);
    }
  });

  it(`caps the list at ${MAX_DISPLAY_SURFACES} entries`, () => {
    const tooMany = Array.from({ length: MAX_DISPLAY_SURFACES + 1 }, () => ({ part: 'p', image: 'a.png' }));
    expect(validateDisplaySurfaces(tooMany).ok).toBe(false);
    expect(validateDisplaySurfaces(tooMany.slice(0, MAX_DISPLAY_SURFACES)).ok).toBe(true);
  });
});

describe('validateIndicatorStates', () => {
  it('accepts undefined and applies the documented defaults', () => {
    expect(validateIndicatorStates(undefined)).toEqual({ ok: true, indicators: [] });
    expect(validateIndicatorStates([{ part: 'led1', color: '#ff2200' }])).toEqual({
      ok: true,
      indicators: [{ part: 'led1', color: '#ff2200', level: 1, intensity: DEFAULT_INDICATOR_INTENSITY }],
    });
  });

  it('keeps explicit level / intensity / sub-mesh', () => {
    const result = validateIndicatorStates([
      { part: 'led1/led-lens', subMesh: 'led-lens', color: '#00FF88', level: 0, intensity: 4 },
    ]);
    expect(result).toEqual({
      ok: true,
      indicators: [{ part: 'led1/led-lens', subMesh: 'led-lens', color: '#00FF88', level: 0, intensity: 4 }],
    });
  });

  it('refuses malformed colours, levels, intensities, parts and sub-meshes', () => {
    const bad: unknown[] = [
      'nope',
      [{ part: '', color: '#ff0000' }],
      [{ part: 'led1', color: 'ff0000' }],
      [{ part: 'led1', color: '#f00' }],
      [{ part: 'led1', color: '#gggggg' }],
      [{ part: 'led1', color: '#ff0000', level: -0.1 }],
      [{ part: 'led1', color: '#ff0000', level: 1.1 }],
      [{ part: 'led1', color: '#ff0000', intensity: -1 }],
      [{ part: 'led1', color: '#ff0000', intensity: 11 }],
      [{ part: 'led1', color: '#ff0000', subMesh: '' }],
    ];
    for (const input of bad) {
      const result = validateIndicatorStates(input);
      expect(result.ok, JSON.stringify(input)).toBe(false);
      if (result.ok) continue;
      expect(result.message.length).toBeGreaterThan(0);
      expect(result.hint.length).toBeGreaterThan(0);
    }
  });

  it(`caps the list at ${MAX_INDICATOR_STATES} entries`, () => {
    const tooMany = Array.from({ length: MAX_INDICATOR_STATES + 1 }, () => ({ part: 'led', color: '#ffffff' }));
    expect(validateIndicatorStates(tooMany).ok).toBe(false);
    expect(validateIndicatorStates(tooMany.slice(0, MAX_INDICATOR_STATES)).ok).toBe(true);
  });
});

describe('computeDisplaySurfacePose', () => {
  it('seats the plane on every face with the face basis and default offset', () => {
    for (const face of DISPLAY_FACES) {
      const pose = computeDisplaySurfacePose(BOX, { face });
      const expected = FACE_POSE[face];
      expect(pose.position.map((v) => Number(v.toFixed(6)))).toEqual(
        expected.position.map((v) => Number(v.toFixed(6))),
      );
      expect(pose.size).toEqual(expected.size);
      expect(pose.basis).toEqual([DISPLAY_SURFACE_AXES[face].u, DISPLAY_SURFACE_AXES[face].v, DISPLAY_SURFACE_AXES[face].n]);
      expect(pose.normal).toEqual(DISPLAY_SURFACE_AXES[face].n as [number, number, number]);
    }
  });

  it('defaults to +z with the full region and the shared offset', () => {
    const pose = computeDisplaySurfacePose(BOX, {});
    expect(pose.position[2]).toBeCloseTo(3 + DEFAULT_DISPLAY_OFFSET_MM, 9);
    expect(pose.size).toEqual([10, 8]);
  });

  it('shifts and shrinks the plane for a sub-region', () => {
    const pose = computeDisplaySurfacePose(BOX, { face: '+z', region: [0.1, 0.2, 0.5, 0.6] });
    // centre offsets: (0.1+0.5-1)/2 = -0.2 of width, (0.2+0.6-1)/2 = -0.1 of height
    expect(pose.position[0]).toBeCloseTo(-2, 9);
    expect(pose.position[1]).toBeCloseTo(-0.8, 9);
    expect(pose.position[2]).toBeCloseTo(3 + DEFAULT_DISPLAY_OFFSET_MM, 9);
    expect(pose.size[0]).toBeCloseTo(4, 9);
    expect(pose.size[1]).toBeCloseTo(3.2, 9);
  });

  it('honours a custom offsetMm', () => {
    expect(computeDisplaySurfacePose(BOX, { face: '+z', offsetMm: 2 }).position[2]).toBeCloseTo(5, 9);
    expect(computeDisplaySurfacePose(BOX, { face: '-x', offsetMm: 0 }).position[0]).toBeCloseTo(-5, 9);
  });

  it('keeps the region centred on a symmetric sub-region', () => {
    const pose = computeDisplaySurfacePose(BOX, { face: '+z', region: [0.1, 0.2, 0.9, 0.8] });
    expect(pose.position[0]).toBeCloseTo(0, 9);
    expect(pose.position[1]).toBeCloseTo(0, 9);
    expect(pose.size[0]).toBeCloseTo(8, 9);
    expect(pose.size[1]).toBeCloseTo(4.8, 9);
  });
});

describe('parsePartAndSubMesh', () => {
  it('prefers an explicit subMesh, then the slash form, then the bare part', () => {
    expect(parsePartAndSubMesh('oled/panel', 'glass')).toEqual({ partName: 'oled', subMeshName: 'glass' });
    expect(parsePartAndSubMesh('oled/panel')).toEqual({ partName: 'oled', subMeshName: 'panel' });
    expect(parsePartAndSubMesh('oled')).toEqual({ partName: 'oled' });
    expect(parsePartAndSubMesh('/panel')).toEqual({ partName: '/panel' });
    expect(parsePartAndSubMesh('a/b/c')).toEqual({ partName: 'a', subMeshName: 'b/c' });
    expect(parsePartAndSubMesh('oled/', '  ')).toEqual({ partName: 'oled' });
  });
});

describe('pickDisplaySubMeshName', () => {
  it('prefers the active area, then the panel, then the glass', () => {
    expect(pickDisplaySubMeshName(['glass', 'panel', 'active-area'])).toBe('active-area');
    expect(pickDisplaySubMeshName(['glass', 'EPaper_Panel'])).toBe('EPaper_Panel');
    expect(pickDisplaySubMeshName(['cover-glass', 'header-pins'])).toBe('cover-glass');
    expect(pickDisplaySubMeshName(['solder-mask', 'gold-pad'])).toBeUndefined();
    expect(pickDisplaySubMeshName([])).toBeUndefined();
  });

  it('matches the display-active / screen forms', () => {
    expect(pickDisplaySubMeshName(['display_active'])).toBe('display_active');
    expect(pickDisplaySubMeshName(['LCD screen'])).toBe('LCD screen');
    expect(pickDisplaySubMeshName(['oled'])).toBe('oled');
  });
});

describe('pickIndicatorSubMeshNames', () => {
  it('returns the LED/lens/dome meshes when present', () => {
    expect(pickIndicatorSubMeshNames(['body', 'led-lens', 'pin'])).toEqual(['led-lens']);
    expect(pickIndicatorSubMeshNames(['dome', 'emitter'])).toEqual(['dome', 'emitter']);
    expect(pickIndicatorSubMeshNames(['indicator', 'bulb', 'lamp'])).toEqual(['indicator', 'bulb', 'lamp']);
    expect(pickIndicatorSubMeshNames(['optic', 'diffuser'])).toEqual(['optic', 'diffuser']);
  });

  it('never picks pin/lead/terminal/contact names as emitters, even with "led" in them', () => {
    expect(pickIndicatorSubMeshNames(['led-pins', 'led-dome'])).toEqual(['led-dome']);
    expect(pickIndicatorSubMeshNames(['led_leads', 'lens'])).toEqual(['lens']);
    expect(pickIndicatorSubMeshNames(['LED-Pins', 'LED-Lens'])).toEqual(['LED-Lens']);
    expect(pickIndicatorSubMeshNames(['led-pins'])).toBeUndefined();
    expect(pickIndicatorSubMeshNames(['led_contact', 'led_terminal'])).toBeUndefined();
    expect(pickIndicatorSubMeshNames(['led-pins', 'body'])).toEqual(['body']);
  });

  it('otherwise drops pins/leads/pads and keeps the body', () => {
    expect(pickIndicatorSubMeshNames(['plastic-body', 'metal-lead'])).toEqual(['plastic-body']);
    expect(pickIndicatorSubMeshNames(['pin', 'leg', 'pad', 'solder'])).toBeUndefined();
    expect(pickIndicatorSubMeshNames(['terminal', 'contact', 'body'])).toEqual(['body']);
  });

  it('returns undefined when every mesh is a candidate (apply to all)', () => {
    expect(pickIndicatorSubMeshNames(['body-a', 'body-b'])).toBeUndefined();
    expect(pickIndicatorSubMeshNames([])).toBeUndefined();
  });
});
