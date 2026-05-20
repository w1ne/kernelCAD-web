import { describe, it, expect } from 'vitest';
import {
  HDRI_PRESET_KEYS,
  HDRI_PRESET_URLS,
  isHdriPresetKey,
  type RenderEnvironmentSpec,
} from '../../../src/shared/intent/renderEnvironmentRecord';

describe('renderEnvironmentRecord', () => {
  it('exposes the 5 canonical preset keys', () => {
    expect(HDRI_PRESET_KEYS).toEqual(['studio', 'softbox', 'neutral', 'outdoor', 'warehouse']);
  });

  it('maps each preset key to a /hdri/<slug>_1k.hdr URL', () => {
    expect(HDRI_PRESET_URLS.studio).toBe('/hdri/studio_small_03_1k.hdr');
    expect(HDRI_PRESET_URLS.softbox).toBe('/hdri/photo_studio_01_1k.hdr');
    expect(HDRI_PRESET_URLS.neutral).toBe('/hdri/brown_photostudio_02_1k.hdr');
    expect(HDRI_PRESET_URLS.outdoor).toBe('/hdri/kloofendal_43d_clear_puresky_1k.hdr');
    expect(HDRI_PRESET_URLS.warehouse).toBe('/hdri/studio_country_hall_1k.hdr');
  });

  it('isHdriPresetKey is a type guard', () => {
    expect(isHdriPresetKey('studio')).toBe(true);
    expect(isHdriPresetKey('mystery')).toBe(false);
    expect(isHdriPresetKey(42)).toBe(false);
  });

  it('RenderEnvironmentSpec supports preset, url, intensity, rotation', () => {
    const a: RenderEnvironmentSpec = { preset: 'studio' };
    const b: RenderEnvironmentSpec = { url: '/hdri/custom.hdr', intensity: 1.5, rotation: 45 };
    expect(a.preset).toBe('studio');
    expect(b.intensity).toBe(1.5);
    expect(b.rotation).toBe(45);
  });
});
