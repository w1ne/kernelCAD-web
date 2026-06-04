/** @vitest-environment happy-dom */
import { describe, expect, it, beforeAll } from 'vitest';
import * as THREE from 'three';
import { makeCheckerTexture, CHECKER_TILE_PX } from './sceneBackgroundTexture';

// Happy-dom / jsdom both ship a no-op 2D canvas context — `getContext('2d')`
// returns `null` rather than a stub. We patch a minimal CanvasRenderingContext2D
// shim onto HTMLCanvasElement.prototype so `makeCheckerTexture` can run.
// Tests then verify the texture's filter/wrap/colorSpace wiring, which is
// the failure mode three.js minor versions actually break.

beforeAll(() => {
    // Minimal shim — just enough for `fillStyle = ...; fillRect(...)`.
    const proto = HTMLCanvasElement.prototype as unknown as {
        getContext: (type: string) => unknown;
    };
    proto.getContext = function getContext(type: string) {
        if (type !== '2d') return null;
        return {
            fillStyle: '#000',
            fillRect: () => {},
            getImageData: () => ({ data: new Uint8ClampedArray(4) }),
        } as unknown as CanvasRenderingContext2D;
    };
});

describe('sceneBackgroundTexture.makeCheckerTexture', () => {
    it('returns a CanvasTexture sized 2*tile by 2*tile', () => {
        const tex = makeCheckerTexture();
        expect(tex).toBeInstanceOf(THREE.CanvasTexture);
        const img = tex.image as HTMLCanvasElement;
        expect(img.width).toBe(CHECKER_TILE_PX * 2);
        expect(img.height).toBe(CHECKER_TILE_PX * 2);
    });

    it('uses RepeatWrapping on both axes so the pattern tiles across the viewport', () => {
        const tex = makeCheckerTexture();
        expect(tex.wrapS).toBe(THREE.RepeatWrapping);
        expect(tex.wrapT).toBe(THREE.RepeatWrapping);
    });

    it('uses NearestFilter for crisp checker squares (no bilinear blur)', () => {
        const tex = makeCheckerTexture();
        expect(tex.magFilter).toBe(THREE.NearestFilter);
        expect(tex.minFilter).toBe(THREE.NearestFilter);
    });

    it('uses sRGB color space so checker greys read as the chosen luma values', () => {
        const tex = makeCheckerTexture();
        expect(tex.colorSpace).toBe(THREE.SRGBColorSpace);
    });
});
