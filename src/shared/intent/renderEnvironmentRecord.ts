// src/shared/intent/renderEnvironmentRecord.ts
//
// Types for the setRenderEnvironment() top-level API. A render-environment
// feature is a capture-only (virtual) node that carries an HDRI lighting
// spec (preset key OR custom .hdr URL + intensity + rotation). It never
// produces OCCT geometry — the renderer reads it directly from the feature
// graph and feeds it to applyEnvironment() helper.

import type { FeatureId } from './types';

export const HDRI_PRESET_KEYS = [
  'studio',
  'softbox',
  'neutral',
  'outdoor',
  'warehouse',
] as const;

export type HdriPresetKey = typeof HDRI_PRESET_KEYS[number];

export const HDRI_PRESET_URLS: Readonly<Record<HdriPresetKey, string>> = {
  studio: '/hdri/studio_small_03_1k.hdr',
  softbox: '/hdri/photo_studio_01_1k.hdr',
  neutral: '/hdri/brown_photostudio_02_1k.hdr',
  outdoor: '/hdri/kloofendal_43d_clear_puresky_1k.hdr',
  warehouse: '/hdri/studio_country_hall_1k.hdr',
};

export function isHdriPresetKey(v: unknown): v is HdriPresetKey {
  return typeof v === 'string' && (HDRI_PRESET_KEYS as readonly string[]).includes(v);
}

/**
 * Author-surface spec for setRenderEnvironment(). Exactly one of `preset` or
 * `url` must be set. `intensity` defaults to 1.0; `rotation` defaults to 0
 * (degrees, Y-axis).
 */
export interface RenderEnvironmentSpec {
  preset?: HdriPresetKey;
  url?: string;
  intensity?: number;
  rotation?: number;
}

/**
 * Metadata stored on a `renderEnvironment` FeatureRecord. Always
 * `virtual: true`. Either `preset` or `url` is populated (validation in
 * `captureSession.addRenderEnvironment` ensures exactly one).
 */
export interface RenderEnvironmentMetadata {
  preset?: HdriPresetKey;
  url?: string;
  intensity: number;
  rotation: number;
  virtual: true;
}

export interface RenderEnvironmentHandle {
  readonly id: FeatureId;
  readonly metadata: RenderEnvironmentMetadata;
}
