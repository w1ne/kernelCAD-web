// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import * as THREE from 'three';
import { rendererSnapshot } from '../rendererSnapshot';

export interface StruckPartsResult {
  parts: string[];
  debug: Record<string, number | boolean>;
}

interface MarkedUserData {
  ownerId?: unknown;
  assemblyPartName?: unknown;
  partName?: unknown;
  name?: unknown;
  shapeIndex?: unknown;
}

/** Raycast painted pixels into the live three.js scene and return the
 *  unique structural identifiers the brush hit. Walks the parent chain
 *  because the named ownerId may live on a parent group rather than the
 *  leaf mesh (consolidated meshes have it, but spring/coil segments
 *  rendered as separate primitives often don't). */
export function struckPartsFromMask(canvas: HTMLCanvasElement | null): StruckPartsResult {
  const { scene, camera } = rendererSnapshot;
  const debug = {
    snapshotReady: !!(scene && camera),
    paintedSamples: 0,
    raysCast: 0,
    anyIntersection: 0,
    namedHits: 0,
  };
  if (!canvas || !scene || !camera) return { parts: [], debug };
  const ctx = canvas.getContext('2d');
  if (!ctx) return { parts: [], debug };
  let img: ImageData;
  try {
    img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  } catch {
    return { parts: [], debug };
  }
  const STEP = 16;
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const hits = new Set<string>();
  // Both canvases share the same parent box and fill it 100%/100%, so
  // their CSS rects coincide. Use the mask's own rect for NDC — no need
  // to cross-reference the renderer canvas.
  const mRect = canvas.getBoundingClientRect();
  for (let y = 0; y < canvas.height; y += STEP) {
    for (let x = 0; x < canvas.width; x += STEP) {
      if (!isPaintedMaskPixel(img, x, y)) continue;
      debug.paintedSamples++;
      // Pixel (x,y) in the mask bitmap → NDC. Bitmap may differ from CSS
      // box size; the ratio collapses out because we go bitmap→fraction→NDC.
      ndc.x = (x / canvas.width) * 2 - 1;
      ndc.y = -((y / canvas.height) * 2 - 1);
      raycaster.setFromCamera(ndc, camera);
      const intersects = raycaster.intersectObjects(scene.children, true);
      debug.raysCast++;
      if (intersects.length > 0) debug.anyIntersection++;
      // Walk first few intersections + their parent chains looking for ANY
      // identifier. Hierarchy: ownerId (named consolidated shape) → name
      // userData → object3D.name → shapeIndex (unnamed shape, still
      // disambiguating). The shapeIndex fallback matters because Luxo-style
      // scripts often leave springs/anchors unnamed but they still have a
      // distinct shapeIndex set on the consolidated mesh's userData.
      const named = firstNamedHit(intersects);
      if (named) {
        hits.add(named);
        debug.namedHits++;
      }
      void mRect; // mRect unused after the rect-collapse simplification — keep for future viewport partial-overlap fixes
    }
  }
  return { parts: Array.from(hits), debug };
}

function isPaintedMaskPixel(img: ImageData, x: number, y: number): boolean {
  const i = (y * img.width + x) * 4;
  if (img.data[i + 3] < 100) return false;
  if (img.data[i] < 200 || img.data[i + 1] > 120) return false;
  return true;
}

function firstNamedHit(intersects: THREE.Intersection[]): string | null {
  for (let k = 0; k < Math.min(3, intersects.length); k++) {
    let obj: THREE.Object3D | null = intersects[k].object;
    while (obj) {
      const named = namedIdentifier(obj);
      if (named) return named;
      obj = obj.parent;
    }
  }
  return null;
}

function namedIdentifier(obj: THREE.Object3D): string | null {
  const u = obj.userData as MarkedUserData;
  const named = nameFromUserData(u) || nameFromObject(obj);
  if (named) return named;
  if (typeof u?.shapeIndex === 'number') return `shape#${u.shapeIndex}`;
  return null;
}

function nameFromUserData(u: MarkedUserData): string | null {
  return (
    (typeof u?.ownerId === 'string' && u.ownerId) ||
    (typeof u?.assemblyPartName === 'string' && u.assemblyPartName) ||
    (typeof u?.partName === 'string' && u.partName) ||
    (typeof u?.name === 'string' && u.name) ||
    null
  );
}

function nameFromObject(obj: THREE.Object3D): string | null {
  return typeof obj.name === 'string' && obj.name.length > 0 && obj.name ? obj.name : null;
}
