// tests/unit/render/sheetViews.test.ts
//
// The seven-view inspection sheet: camera directions for every RenderView
// (the screen axes VIEW_DESCRIPTIONS promises) and the labelled sheet
// compositor's grid geometry.
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import sharp from 'sharp';
import { fitCameraToBounds } from '../../../src/studio/components/demoPlayer/demoPlayerGeometry';
import { compositeSheet } from '../../../src/agent/render/headlessRender';
import { SHEET_VIEWS, isRenderView, type RenderView } from '../../../src/shared/render/views';

type Vec3 = [number, number, number];

function screenAxes(view: RenderView): { toCamera: Vec3; right: Vec3; up: Vec3 } {
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
  fitCameraToBounds(camera, { min: [-10, -10, -10], max: [10, 10, 10] }, view, 1);
  camera.updateMatrixWorld();
  const e = camera.matrixWorld.elements;
  const round = (v: number[]): Vec3 => v.map((n) => Math.round(n) + 0) as Vec3;
  return {
    right: round([e[0], e[1], e[2]]),
    up: round([e[4], e[5], e[6]]),
    toCamera: round(camera.position.clone().normalize().toArray()),
  };
}

describe('sheet views — camera directions', () => {
  it.each<[RenderView, Vec3, Vec3, Vec3]>([
    // view, camera side, screen right, screen up
    ['front', [0, -1, 0], [1, 0, 0], [0, 0, 1]],
    ['back', [0, 1, 0], [-1, 0, 0], [0, 0, 1]],
    ['right', [1, 0, 0], [0, 1, 0], [0, 0, 1]],
    ['left', [-1, 0, 0], [0, -1, 0], [0, 0, 1]],
    ['top', [0, 0, 1], [1, 0, 0], [0, 1, 0]],
    ['bottom', [0, 0, -1], [1, 0, 0], [0, -1, 0]],
  ])('%s: camera on %j, screen right %j, screen up %j', (view, toCamera, right, up) => {
    expect(screenAxes(view)).toEqual({ toCamera, right, up });
  });

  it('lists every view once and validates names', () => {
    expect(new Set(SHEET_VIEWS).size).toBe(7);
    expect(isRenderView('bottom')).toBe(true);
    expect(isRenderView('side')).toBe(false);
  });
});

describe('compositeSheet', () => {
  const tile = () =>
    sharp({ create: { width: 100, height: 80, channels: 3, background: { r: 200, g: 200, b: 200 } } })
      .png()
      .toBuffer();

  it('tiles seven views into a 4×2 grid', async () => {
    const t = await tile();
    const all = Object.fromEntries(SHEET_VIEWS.map((v) => [v, t]));
    const meta = await sharp(await compositeSheet(all, 100, 80)).metadata();
    expect([meta.width, meta.height]).toEqual([400, 160]);
  });

  it('closes up missing views', async () => {
    const t = await tile();
    const meta = await sharp(await compositeSheet({ front: t, bottom: t }, 100, 80)).metadata();
    expect([meta.width, meta.height]).toEqual([200, 80]);
  });

  it('refuses an empty capture', async () => {
    await expect(compositeSheet({}, 100, 80)).rejects.toThrow(/no views/);
  });
});
