// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useFrame } from '@react-three/fiber';
import { useState } from 'react';
import * as THREE from 'three';
import { visibleLabels, type PlacedLabel } from './labelCollisions';
import type { PlacedDimension } from './placement';

/** Approximate label pill size in CSS pixels (text-sm semibold + padding). */
const CHAR_PX = 8;
const PAD_X_PX = 18;
const LINE_PX = 26;
const SUBLINE_PX = 14;

/** A dimension shorter than this on screen is hidden. */
export const MIN_SCREEN_LENGTH_PX = 16;
/** A dimension drawn at less than this fraction of its true length (seen
 *  within ~70° of end-on) is hidden: a stub label reads as clutter. */
export const MIN_FORESHORTENING = 0.35;

/** World units covered by one screen pixel at `p` (as in ScreenScaled). */
function worldPerPixel(camera: THREE.Camera, p: readonly [number, number, number], height: number): number {
    const cam = camera as THREE.PerspectiveCamera & THREE.OrthographicCamera;
    if (cam.isOrthographicCamera) return (cam.top - cam.bottom) / cam.zoom / height;
    const d = camera.position.distanceTo(new THREE.Vector3(p[0], p[1], p[2]));
    return (2 * d * Math.tan((cam.fov * Math.PI) / 360)) / height;
}

/** True when the dimension reads on screen: long enough and not seen end-on. */
function sideOn(d: PlacedDimension, camera: THREE.Camera, size: { width: number; height: number }): boolean {
    const a = toScreen(d.a, camera, size);
    const b = toScreen(d.b, camera, size);
    const screen = Math.hypot(b.x - a.x, b.y - a.y);
    const world = Math.hypot(d.b[0] - d.a[0], d.b[1] - d.a[1], d.b[2] - d.a[2]);
    const drawn = screen * worldPerPixel(camera, labelAnchor(d), size.height);
    return screen >= MIN_SCREEN_LENGTH_PX && drawn >= MIN_FORESHORTENING * world;
}

function toScreen(p: readonly [number, number, number], camera: THREE.Camera, size: { width: number; height: number }) {
    const v = new THREE.Vector3(p[0], p[1], p[2]).project(camera);
    return { x: ((v.x + 1) / 2) * size.width, y: ((1 - v.y) / 2) * size.height };
}

function labelAnchor(d: PlacedDimension): [number, number, number] {
    return d.labelAt ?? [(d.a[0] + d.b[0]) / 2, (d.a[1] + d.b[1]) / 2, (d.a[2] + d.b[2]) / 2];
}

/** Screen boxes of the labels worth showing for this camera and canvas
 *  size; dimensions seen end-on are left out. */
export function screenLabels(
    placed: readonly PlacedDimension[],
    camera: THREE.Camera,
    size: { width: number; height: number },
): PlacedLabel[] {
    const out: PlacedLabel[] = [];
    for (const d of placed) {
        if (!sideOn(d, camera, size)) continue;
        const c = toScreen(labelAnchor(d), camera, size);
        const w = Math.max(d.label.length, d.sublabel?.length ?? 0) * CHAR_PX + PAD_X_PX;
        const h = LINE_PX + (d.sublabel ? SUBLINE_PX : 0);
        out.push({ id: d.id, priority: d.priority, box: { x: c.x - w / 2, y: c.y - h / 2, w, h } });
    }
    return out;
}

/** Ids of dimensions seen side-on whose label does not collide with a more
 *  important one. Re-evaluated every animation frame; state changes only when the
 *  visible set does, so a still camera re-renders nothing. */
export function useVisibleDimensions(placed: readonly PlacedDimension[]): ReadonlySet<string> {
    const [visible, setVisible] = useState<{ placed: readonly PlacedDimension[]; key: string; ids: ReadonlySet<string> } | null>(null);
    useFrame(({ camera, size }) => {
        const ids = visibleLabels(screenLabels(placed, camera, size));
        const key = ids.join('|');
        if (visible?.placed !== placed || key !== visible.key) setVisible({ placed, key, ids: new Set(ids) });
    });
    // Until the first frame with these dimensions, show them all.
    return visible?.placed === placed ? visible.ids : new Set(placed.map((d) => d.id));
}
