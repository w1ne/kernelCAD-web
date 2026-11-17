// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Exact CAD overlap of the body pairs the compiled model put in contact.
// MuJoCo collides the convex hull of a mesh geom. A hull can overlap when
// the solids do not. The volume comes from the same boolean probe
// `detectInterferences` runs; the gap comes from `brepExtremaDistance`.

import type { Assembly } from '../capture/assembly';
import { analysisBodyOf, initOcct, OcctBackend } from '../../kernel/backends/occt/occtBackend';
import { isSceneBackend, type SceneBackend } from '../../kernel/backends/sceneBackend';
import { createOcctLowerer } from '../backends/occt/occtLowerer';
import { RecomputeEngine } from '../compute/recomputeEngine';
import { detectInterferences } from './detectInterferences';
import { brepExtremaDistanceBetween, wrappedShape } from './brepDistance';
import { authoredRestPoses } from './mjcfRestPose';

export interface CadExactMeasurement {
    readonly confirmed: boolean;
    /** Boolean intersection volume of the two solids at the authored pose. */
    readonly volumeMm3: number;
    /** Minimum BREP distance in millimetres. Zero when the solids overlap. */
    readonly distanceMm?: number;
}

function orderedKey(a: string, b: string): string {
    return a < b ? `${a}\0${b}` : `${b}\0${a}`;
}

function uniquePairs(
    pairs: readonly { readonly bodyA: string; readonly bodyB: string }[],
): Array<{ bodyA: string; bodyB: string }> {
    const seen = new Set<string>();
    const out: Array<{ bodyA: string; bodyB: string }> = [];
    for (const pair of pairs) {
        const key = orderedKey(pair.bodyA, pair.bodyB);
        if (seen.has(key)) continue;
        seen.add(key);
        const [bodyA, bodyB] = pair.bodyA < pair.bodyB ? [pair.bodyA, pair.bodyB] : [pair.bodyB, pair.bodyA];
        out.push({ bodyA, bodyB });
    }
    return out;
}

async function loweredAtAuthoredPose(arm: Assembly): Promise<SceneBackend | undefined> {
    await initOcct();
    const scene = await arm.solvedModel(authoredRestPoses(arm), { validate: 'off' });
    const engine = new RecomputeEngine(createOcctLowerer(arm.__session()));
    const result = await engine.run(arm.__session().getRecords(), {
        paramTable: arm.__session().paramTable,
        gatedFeatureNames: arm.__session().gatedFeatureNames,
        seedShapes: arm.__session().reusableLoweredPrefix(),
    });
    const sourceId = scene.__sourceFeatureId();
    if (sourceId === undefined) return undefined;
    const lowered = result.shapes.get(sourceId);
    return lowered !== undefined && isSceneBackend(lowered) ? lowered : undefined;
}

function distanceMm(scene: SceneBackend, bodyA: string, bodyB: string): number | undefined {
    const a = scene.parts.find((part) => part.name === bodyA);
    const b = scene.parts.find((part) => part.name === bodyB);
    if (a === undefined || b === undefined) return undefined;
    if (!(a.shape instanceof OcctBackend) || !(b.shape instanceof OcctBackend)) return undefined;
    const posedA = (analysisBodyOf(a.shape) as OcctBackend).located(a.worldTransform);
    const posedB = (analysisBodyOf(b.shape) as OcctBackend).located(b.worldTransform);
    try {
        return brepExtremaDistanceBetween(wrappedShape(posedA), wrappedShape(posedB));
    } finally {
        posedA.dispose();
        posedB.dispose();
    }
}

/**
 * Exact solid overlap at the authored rest, for the pairs the caller names.
 * A pair whose boolean does not finish is `confirmed: false`. An empty pair
 * list does not lower the assembly.
 */
export async function measureCadExactPairs(
    arm: Assembly,
    pairs: readonly { readonly bodyA: string; readonly bodyB: string }[],
): Promise<Map<string, CadExactMeasurement>> {
    const wanted = uniquePairs(pairs);
    const out = new Map<string, CadExactMeasurement>();
    if (wanted.length === 0) return out;
    let scene: SceneBackend | undefined;
    try {
        scene = await loweredAtAuthoredPose(arm);
    } catch {
        scene = undefined;
    }
    if (scene === undefined) {
        for (const pair of wanted) out.set(orderedKey(pair.bodyA, pair.bodyB), { confirmed: false, volumeMm3: 0 });
        return out;
    }
    const brep = scene.parts.filter((part) => part.shape instanceof OcctBackend);
    const indexOf = new Map(brep.map((part, index) => [part.name, index]));
    const explicit: Array<readonly [number, number]> = [];
    for (const pair of wanted) {
        const i = indexOf.get(pair.bodyA);
        const j = indexOf.get(pair.bodyB);
        if (i === undefined || j === undefined) continue;
        explicit.push(i < j ? [i, j] : [j, i]);
    }
    // Epsilon 0 keeps the measured volume. The caller applies the shared
    // 0.01 mm³ floor when it decides a hull artefact.
    const detected = explicit.length === 0
        ? undefined
        : detectInterferences(scene, 0, new Set<string>(), [], undefined, explicit);
    const unconfirmed = new Set(
        (detected?.unconfirmedPairs ?? []).map((pair) => orderedKey(pair.a, pair.b)),
    );
    const volumeOf = new Map<string, number>();
    for (const pair of detected?.pairs ?? []) volumeOf.set(orderedKey(pair.a, pair.b), pair.volumeMm3);
    for (const pair of wanted) {
        const key = orderedKey(pair.bodyA, pair.bodyB);
        if (indexOf.get(pair.bodyA) === undefined || indexOf.get(pair.bodyB) === undefined || unconfirmed.has(key)) {
            out.set(key, { confirmed: false, volumeMm3: 0 });
            continue;
        }
        let gap: number | undefined;
        try {
            gap = distanceMm(scene, pair.bodyA, pair.bodyB);
        } catch {
            gap = undefined;
        }
        out.set(key, {
            confirmed: true,
            volumeMm3: volumeOf.get(key) ?? 0,
            ...(gap !== undefined && Number.isFinite(gap) ? { distanceMm: gap } : {}),
        });
    }
    return out;
}
