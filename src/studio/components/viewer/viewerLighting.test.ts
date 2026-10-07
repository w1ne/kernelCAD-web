// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
    ROOM_ENVIRONMENT_INTENSITY,
    ROOM_ENVIRONMENT_ROTATION_X,
    VIEWER_FILL_LIGHT,
    VIEWER_HEMISPHERE,
    VIEWER_KEY_LIGHT,
    VIEWER_TONE_MAPPING,
    VIEWER_TONE_MAPPING_EXPOSURE,
} from './viewerLighting';

describe('viewer lighting rig', () => {
    it('uses AgX at exposure 1 so light faces roll off instead of clipping', () => {
        expect(VIEWER_TONE_MAPPING).toBe(THREE.AgXToneMapping);
        expect(VIEWER_TONE_MAPPING_EXPOSURE).toBe(1);
        expect(ROOM_ENVIRONMENT_INTENSITY).toBe(0.62);
    });

    it('puts the room ceiling on +Z and the key overhead in the Z-up scene', () => {
        expect(ROOM_ENVIRONMENT_ROTATION_X).toBeCloseTo(Math.PI / 2);
        expect(VIEWER_HEMISPHERE.position).toEqual([0, 0, 1]);
        expect(VIEWER_HEMISPHERE.intensity).toBe(1.45);
        const [kx, ky, kz] = VIEWER_KEY_LIGHT.position;
        expect(kz).toBeGreaterThan(Math.abs(kx));
        expect(kz).toBeGreaterThan(Math.abs(ky));
        expect(VIEWER_KEY_LIGHT.intensity).toBe(0.34);
        const [, , fz] = VIEWER_FILL_LIGHT.position;
        expect(fz).toBeGreaterThan(0);
        expect(VIEWER_FILL_LIGHT.intensity).toBe(0.26);
        const ratio = VIEWER_KEY_LIGHT.intensity / VIEWER_FILL_LIGHT.intensity;
        expect(ratio).toBeGreaterThan(1);
        expect(ratio).toBeLessThan(1.5);
    });
});
