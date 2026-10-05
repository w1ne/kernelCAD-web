// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type { V3 } from '../../../../shared/intent/viewerDimension';
import { markVisible, type PlacedLabel } from './labelCollisions';
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

type Size = { width: number; height: number };

/** Per-`placed` buffers the per-frame pass writes into, so a frame
 *  allocates nothing. Slots follow `placed`, which is in priority order. */
export interface LabelPass {
    placed: readonly PlacedDimension[];
    labels: PlacedLabel[];
    anchors: V3[];
    worldLengths: number[];
    active: boolean[];
    next: boolean[];
    shown: boolean[];
    allIds: ReadonlySet<string>;
}

export function prepareLabelPass(placed: readonly PlacedDimension[]): LabelPass {
    return {
        placed,
        labels: placed.map((d) => ({
            id: d.id,
            priority: d.priority,
            box: {
                x: 0,
                y: 0,
                w: Math.max(d.label.length, d.sublabel?.length ?? 0) * CHAR_PX + PAD_X_PX,
                h: LINE_PX + (d.sublabel ? SUBLINE_PX : 0),
            },
        })),
        anchors: placed.map((d) => d.labelAt ?? [(d.a[0] + d.b[0]) / 2, (d.a[1] + d.b[1]) / 2, (d.a[2] + d.b[2]) / 2]),
        worldLengths: placed.map((d) => Math.hypot(d.b[0] - d.a[0], d.b[1] - d.a[1], d.b[2] - d.a[2])),
        active: placed.map(() => false),
        next: placed.map(() => false),
        shown: placed.map(() => true),
        allIds: new Set(placed.map((d) => d.id)),
    };
}

const scratchA = new THREE.Vector3();
const scratchB = new THREE.Vector3();
const scratchC = new THREE.Vector3();

/** Projects `v` in place; x/y become CSS pixels. */
function toScreen(v: THREE.Vector3, camera: THREE.Camera, size: Size): THREE.Vector3 {
    v.project(camera);
    v.x = ((v.x + 1) / 2) * size.width;
    v.y = ((1 - v.y) / 2) * size.height;
    return v;
}

/** World units covered by one screen pixel at `p` (as in ScreenScaled). */
function worldPerPixel(camera: THREE.Camera, p: THREE.Vector3, height: number): number {
    const cam = camera as THREE.PerspectiveCamera & THREE.OrthographicCamera;
    if (cam.isOrthographicCamera) return (cam.top - cam.bottom) / cam.zoom / height;
    return (2 * camera.position.distanceTo(p) * Math.tan((cam.fov * Math.PI) / 360)) / height;
}

/** Fills slot `i`: label box position, and whether the dimension reads on
 *  screen (long enough and not seen end-on). */
function projectSlot(pass: LabelPass, i: number, camera: THREE.Camera, size: Size): void {
    const d = pass.placed[i];
    const a = toScreen(scratchA.set(d.a[0], d.a[1], d.a[2]), camera, size);
    const b = toScreen(scratchB.set(d.b[0], d.b[1], d.b[2]), camera, size);
    const anchor = pass.anchors[i];
    const wpp = worldPerPixel(camera, scratchC.set(anchor[0], anchor[1], anchor[2]), size.height);
    const c = toScreen(scratchC, camera, size);
    const screen = Math.hypot(b.x - a.x, b.y - a.y);
    pass.active[i] = screen >= MIN_SCREEN_LENGTH_PX && screen * wpp >= MIN_FORESHORTENING * pass.worldLengths[i];
    const box = pass.labels[i].box;
    box.x = c.x - box.w / 2;
    box.y = c.y - box.h / 2;
}

/** One label pass for this camera: updates `pass.shown`, returns true when
 *  the visible set changed. Allocates nothing. */
export function runLabelPass(pass: LabelPass, camera: THREE.Camera, size: Size): boolean {
    for (let i = 0; i < pass.placed.length; i++) projectSlot(pass, i, camera, size);
    markVisible(pass.labels, pass.active, pass.next);
    let changed = false;
    for (let i = 0; i < pass.next.length; i++) {
        if (pass.next[i] !== pass.shown[i]) {
            pass.shown[i] = pass.next[i];
            changed = true;
        }
    }
    return changed;
}

/** Screen boxes of the labels worth showing (test/debug helper; allocates). */
export function screenLabels(placed: readonly PlacedDimension[], camera: THREE.Camera, size: Size): PlacedLabel[] {
    const pass = prepareLabelPass(placed);
    for (let i = 0; i < placed.length; i++) projectSlot(pass, i, camera, size);
    return pass.labels.filter((_, i) => pass.active[i]);
}

/** Ids of dimensions seen side-on whose label does not collide with a more
 *  important one. Runs on animation frames, only when the camera, canvas
 *  size or dimensions changed; React state changes only when the visible
 *  set does. */
export function useVisibleDimensions(placed: readonly PlacedDimension[]): ReadonlySet<string> {
    const pass = useMemo(() => prepareLabelPass(placed), [placed]);
    // Camera and canvas state the last pass ran for; an unchanged view skips the pass.
    const stamp = useRef({ pass: null as LabelPass | null, view: new THREE.Matrix4(), proj: new THREE.Matrix4(), w: -1, h: -1 });
    const [visible, setVisible] = useState<{ pass: LabelPass; ids: ReadonlySet<string> } | null>(null);
    useFrame(({ camera, size }) => {
        const s = stamp.current;
        const same = s.pass === pass && s.w === size.width && s.h === size.height
            && s.view.equals(camera.matrixWorldInverse) && s.proj.equals(camera.projectionMatrix);
        if (same) return;
        s.pass = pass;
        s.w = size.width;
        s.h = size.height;
        s.view.copy(camera.matrixWorldInverse);
        s.proj.copy(camera.projectionMatrix);
        const changed = runLabelPass(pass, camera, size);
        if (changed || visible?.pass !== pass) {
            setVisible({ pass, ids: new Set(pass.placed.filter((_, i) => pass.shown[i]).map((d) => d.id)) });
        }
    });
    // Until the first pass with these dimensions, show them all.
    return visible?.pass === pass ? visible.ids : pass.allIds;
}
