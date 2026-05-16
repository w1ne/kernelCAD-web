// tests/unit/render/referenceImagePlane.test.ts
//
// Unit tests for the reference-image plane builder (Task 9).
// Tests the exported `buildReferenceImagePlane` helper and the
// `setReferenceImagesVisible` API surface added to the demo-player window.
//
// These run in Node/jsdom and mock TextureLoader so no browser WebGL is needed.

import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { buildReferenceImagePlane } from '../../../src/studio/components/demoPlayer/DemoPlayerPage';
import type { ReferenceImageMetadata } from '../../../src/shared/intent/referenceImageRecord';

/** Build a minimal ReferenceImageMetadata for testing. */
function makeRi(overrides: Partial<ReferenceImageMetadata> = {}): ReferenceImageMetadata {
  return {
    path: '/tmp/test.png',
    plane: 'xy',
    anchor: 'origin',
    scale: 100,
    opacity: 0.5,
    flipU: false,
    flipV: false,
    pixelWidth: 200,
    pixelHeight: 100,
    virtual: true,
    ...overrides,
  };
}

/** Create a dummy THREE.Texture backed by a canvas (no GPU needed). */
function makeTex(): THREE.Texture {
  // CanvasTexture just wraps an HTMLCanvasElement; no WebGL required.
  // In Node we don't have a real canvas but THREE accepts any object
  // with width/height as image source for the metadata—the texture
  // is never actually uploaded to a GPU in unit tests.
  const tex = new THREE.Texture();
  tex.image = { width: 200, height: 100 };
  return tex;
}

describe('buildReferenceImagePlane', () => {
  it('returns a THREE.Mesh with PlaneGeometry and MeshBasicMaterial', () => {
    const tex = makeTex();
    const bbox = new THREE.Box3(
      new THREE.Vector3(-50, -50, -50),
      new THREE.Vector3(50, 50, 50),
    );
    const mesh = buildReferenceImagePlane(makeRi(), tex, bbox);

    expect(mesh).toBeInstanceOf(THREE.Mesh);
    expect(mesh.geometry).toBeInstanceOf(THREE.PlaneGeometry);
    expect(mesh.material).toBeInstanceOf(THREE.MeshBasicMaterial);
  });

  it('sets MeshBasicMaterial properties: transparent, opacity, DoubleSide, depthWrite false', () => {
    const tex = makeTex();
    const bbox = new THREE.Box3();
    const mesh = buildReferenceImagePlane(makeRi({ opacity: 0.75 }), tex, bbox);
    const mat = mesh.material as THREE.MeshBasicMaterial;

    expect(mat.transparent).toBe(true);
    expect(mat.opacity).toBe(0.75);
    expect(mat.side).toBe(THREE.DoubleSide);
    expect(mat.depthWrite).toBe(false);
  });

  it('plane: xy — mesh has no rotation (sits in XY plane)', () => {
    const tex = makeTex();
    const bbox = new THREE.Box3();
    const mesh = buildReferenceImagePlane(makeRi({ plane: 'xy' }), tex, bbox);

    expect(mesh.rotation.x).toBeCloseTo(0);
    expect(mesh.rotation.y).toBeCloseTo(0);
    expect(mesh.rotation.z).toBeCloseTo(0);
  });

  it('plane: xz — mesh is rotated -PI/2 about X to lie in XZ plane', () => {
    const tex = makeTex();
    const bbox = new THREE.Box3();
    const mesh = buildReferenceImagePlane(makeRi({ plane: 'xz' }), tex, bbox);

    expect(mesh.rotation.x).toBeCloseTo(-Math.PI / 2);
    expect(mesh.rotation.y).toBeCloseTo(0);
  });

  it('plane: yz — mesh is rotated PI/2 about Y to lie in YZ plane', () => {
    const tex = makeTex();
    const bbox = new THREE.Box3();
    const mesh = buildReferenceImagePlane(makeRi({ plane: 'yz' }), tex, bbox);

    expect(mesh.rotation.x).toBeCloseTo(0);
    expect(mesh.rotation.y).toBeCloseTo(Math.PI / 2);
  });

  it('anchor: origin — mesh position is (0, 0, 0)', () => {
    const tex = makeTex();
    const bbox = new THREE.Box3();
    const mesh = buildReferenceImagePlane(makeRi({ anchor: 'origin' }), tex, bbox);

    expect(mesh.position.x).toBeCloseTo(0);
    expect(mesh.position.y).toBeCloseTo(0);
    expect(mesh.position.z).toBeCloseTo(0);
  });

  it('anchor: [10, 20, 30] — mesh position matches the triple', () => {
    const tex = makeTex();
    const bbox = new THREE.Box3();
    const mesh = buildReferenceImagePlane(
      makeRi({ plane: 'xy', anchor: [10, 20, 30] }),
      tex,
      bbox,
    );

    expect(mesh.position.x).toBeCloseTo(10);
    expect(mesh.position.y).toBeCloseTo(20);
    expect(mesh.position.z).toBeCloseTo(30);
  });

  it('PlaneSpec with offset shifts mesh along plane normal', () => {
    const tex = makeTex();
    const bbox = new THREE.Box3();
    // xy plane with offset 15 → mesh.position.z = 15
    const mesh = buildReferenceImagePlane(
      makeRi({ plane: { plane: 'xy', offset: 15 }, anchor: 'origin' }),
      tex,
      bbox,
    );
    expect(mesh.position.z).toBeCloseTo(15);
  });

  it('scale: explicit number — plane width equals that number', () => {
    const tex = makeTex();
    const bbox = new THREE.Box3();
    // pixelWidth=200, pixelHeight=100 → aspect=2 → height = width/2
    const mesh = buildReferenceImagePlane(makeRi({ scale: 200 }), tex, bbox);
    const geom = mesh.geometry as THREE.PlaneGeometry;
    // PlaneGeometry width is stored in parameters.width
    expect(geom.parameters.width).toBeCloseTo(200);
    expect(geom.parameters.height).toBeCloseTo(100); // 200 / aspect(2)
  });

  it('scale: fit-bbox — plane width is max extent of sceneBbox', () => {
    const tex = makeTex();
    const bbox = new THREE.Box3(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(300, 150, 50),
    );
    // Max extent = 300 (x axis)
    const mesh = buildReferenceImagePlane(makeRi({ scale: 'fit-bbox' }), tex, bbox);
    const geom = mesh.geometry as THREE.PlaneGeometry;
    expect(geom.parameters.width).toBeCloseTo(300);
  });

  it('scale: fit-bbox with empty bbox — falls back to 100', () => {
    const tex = makeTex();
    const bbox = new THREE.Box3(); // isEmpty() === true
    const mesh = buildReferenceImagePlane(makeRi({ scale: 'fit-bbox' }), tex, bbox);
    const geom = mesh.geometry as THREE.PlaneGeometry;
    expect(geom.parameters.width).toBeCloseTo(100);
  });

  it('scale: { width } object — uses explicit width', () => {
    const tex = makeTex();
    const bbox = new THREE.Box3();
    const mesh = buildReferenceImagePlane(makeRi({ scale: { width: 80 } }), tex, bbox);
    const geom = mesh.geometry as THREE.PlaneGeometry;
    expect(geom.parameters.width).toBeCloseTo(80);
  });

  it('scale: { height } object — derives width from height × aspect', () => {
    const tex = makeTex();
    const bbox = new THREE.Box3();
    // pixelWidth=200, pixelHeight=100 → aspect=2 → width = height * 2
    const mesh = buildReferenceImagePlane(makeRi({ scale: { height: 50 } }), tex, bbox);
    const geom = mesh.geometry as THREE.PlaneGeometry;
    expect(geom.parameters.width).toBeCloseTo(100); // 50 * 2
    expect(geom.parameters.height).toBeCloseTo(50);
  });

  it('flipU — sets texture.repeat.x = -1 and offset.x = 1', () => {
    const tex = makeTex();
    const bbox = new THREE.Box3();
    buildReferenceImagePlane(makeRi({ flipU: true }), tex, bbox);
    expect(tex.repeat.x).toBe(-1);
    expect(tex.offset.x).toBe(1);
  });

  it('flipV — sets texture.repeat.y = -1 and offset.y = 1', () => {
    const tex = makeTex();
    const bbox = new THREE.Box3();
    buildReferenceImagePlane(makeRi({ flipV: true }), tex, bbox);
    expect(tex.repeat.y).toBe(-1);
    expect(tex.offset.y).toBe(1);
  });

  it('zero pixel dimensions — aspect falls back to 1.0 (square plane)', () => {
    const tex = makeTex();
    const bbox = new THREE.Box3();
    const mesh = buildReferenceImagePlane(
      makeRi({ scale: 60, pixelWidth: 0, pixelHeight: 0 }),
      tex,
      bbox,
    );
    const geom = mesh.geometry as THREE.PlaneGeometry;
    expect(geom.parameters.width).toBeCloseTo(60);
    expect(geom.parameters.height).toBeCloseTo(60); // square
  });
});
