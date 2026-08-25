// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Adapter: FeatureRecord[] → the part / joint counts of the LOADED model.
//
// The Validity panel used to render `0 parts · 0 joints` for every model
// because `reviewToValidity` hardcoded both counts (its own comment called
// this a "Phase 1.1 conservative adapter" pending a deeper server payload).
// The counts are recoverable client-side from the same `featureRecords` the
// Scene tab already lists, so the panel no longer has to wait on the server.
//
// Two joint vocabularies exist and BOTH are counted:
//   - joint primitives — `asm.revolute(...)` / `.prismatic(...)` / `.ball(...)`
//     land in `Assembly.__joints()` and capture as `assemblyJoint` records
//     (and as `metadata.jointIds` on the `solvedAssembly` record).
//   - mates — `asm.mate(...)` lands in `Assembly.__mates()` and capture as
//     `metadata.mates` on the `solvedAssembly` / `assemblyModel` record.
// Counting only one of them under-reports a model that uses the other.

import type { FeatureRecord } from '../../shared/intent/featureRecord';
import type { EncodedMateRecord } from '../../modeling/capture/captureSession';

export interface ModelTopologyCounts {
    readonly partCount: number;
    readonly jointCount: number;
}

export const EMPTY_MODEL_TOPOLOGY: ModelTopologyCounts = { partCount: 0, jointCount: 0 };

/**
 * Count the assembly parts and the joints (primitives + mates) declared by
 * the records of the currently loaded model.
 *
 * Deduped by name so a script that resolves the same assembly twice (two
 * `solvedAssembly` records over the same parts) is not double counted —
 * that mirrors the last-wins precedence `extractJointSnapshots` applies.
 */
export function countModelTopology(
    records: readonly FeatureRecord[] | null | undefined,
): ModelTopologyCounts {
    if (records == null || records.length === 0) return EMPTY_MODEL_TOPOLOGY;

    const partKeys = new Set<string>();
    const jointNames = new Set<string>();

    for (const rec of records) {
        if (rec.kind === 'assemblyPart') {
            const meta = rec.metadata as { assemblyName?: string; partName?: string } | undefined;
            const partName = typeof meta?.partName === 'string' ? meta.partName : null;
            // Qualify by assembly so two assemblies with a part of the same
            // name still count as two parts.
            partKeys.add(partName === null ? rec.id : `${meta?.assemblyName ?? ''}::${partName}`);
            continue;
        }
        if (rec.kind === 'assemblyJoint') {
            const meta = rec.metadata as { assemblyName?: string; jointName?: string } | undefined;
            const jointName = typeof meta?.jointName === 'string' ? meta.jointName : null;
            jointNames.add(jointName === null ? rec.id : `${meta?.assemblyName ?? ''}::${jointName}`);
            continue;
        }
        if (rec.kind !== 'solvedAssembly' && rec.kind !== 'assemblyModel') continue;
        const meta = rec.metadata as
            | { assemblyName?: string; mates?: readonly EncodedMateRecord[] }
            | undefined;
        for (const mate of meta?.mates ?? []) {
            jointNames.add(`${meta?.assemblyName ?? ''}::${mate.name}`);
        }
    }

    return { partCount: partKeys.size, jointCount: jointNames.size };
}
