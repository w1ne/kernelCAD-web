// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/studio/components/viewer/directEditTarget.ts
//
// Pure decision logic for the direct-edit gizmo: which geometry/anchor a
// viewer selection maps to, and whether that anchor is driven by the
// assembly's pose graph (mates/joints) so a local translate must be refused.

import type { GeometryResult } from '../../../shared/worker/geometryEngine';
import type { FeatureRecord } from '../../../shared/intent/featureRecord';
import type { DirectEditAnchor } from '../../../modeling/directEdit/anchors';

export interface SelectionAnchor {
    readonly geometry: GeometryResult;
    readonly anchor: DirectEditAnchor;
}

/**
 * Resolve the viewer's selected id to the geometry it names and the source
 * anchor to edit. Mirrors `Viewer.tsx`'s identity convention: assembly parts
 * carry `assemblyPartName`, plain shapes their returned-variable name. An
 * anonymous geometry cannot anchor a source edit.
 */
export function resolveAnchor(
    selectionId: string | null | undefined,
    geometries: readonly GeometryResult[],
    itemNames: readonly (string | null)[],
): SelectionAnchor | null {
    if (selectionId == null) return null;
    const index = geometries.findIndex(
        (g, i) => (g.assemblyPartName ?? itemNames[i]) === selectionId,
    );
    if (index < 0) return null;
    const geometry = geometries[index];
    const resolvedName = geometry?.assemblyPartName ?? itemNames[index];
    if (!geometry || resolvedName == null) return null;
    const anchor: DirectEditAnchor = geometry.assemblyPartName
        ? { kind: 'part', name: geometry.assemblyPartName }
        : { kind: 'variable', name: resolvedName };
    return { geometry, anchor };
}

function featureRefTargetsPart(inputs: FeatureRecord['inputs'], partId: string): boolean {
    return Object.values(inputs).some((ref) => ref.kind === 'feature' && ref.id === partId);
}

function connectorRefPartName(ref: unknown): string | null {
    if (typeof ref !== 'string') return null;
    const dot = ref.indexOf('.');
    return dot > 0 ? ref.slice(0, dot) : null;
}

interface MateMetadataView {
    readonly partIds?: readonly string[];
    readonly jointIds?: readonly string[];
    readonly mates?: readonly { a?: unknown; b?: unknown }[];
}

interface ConnectMetadataView {
    readonly a?: { partName?: unknown };
    readonly b?: { partName?: unknown };
}

function findPartRecord(
    features: readonly FeatureRecord[],
    name: string,
): FeatureRecord | undefined {
    return features.find(
        (record) =>
            record.kind === 'assemblyPart'
            && (record.metadata as { partName?: unknown } | undefined)?.partName === name,
    );
}

function hasLegacyConnectPlacement(partRecord: FeatureRecord | undefined): boolean {
    return (
        partRecord != null
        && (partRecord.metadata as { placedBy?: unknown } | undefined)?.placedBy != null
    );
}

function jointOrConnectDrivesPart(
    record: FeatureRecord,
    partId: string | undefined,
    partName: string,
): boolean {
    if (partId !== undefined && featureRefTargetsPart(record.inputs, partId)) return true;
    const meta = record.metadata as ConnectMetadataView | undefined;
    return meta?.a?.partName === partName || meta?.b?.partName === partName;
}

function mateGraphDrivesPart(
    record: FeatureRecord,
    partId: string | undefined,
    partName: string,
): boolean {
    const meta = record.metadata as MateMetadataView | undefined;
    const hasMateGraph = (meta?.mates?.length ?? 0) > 0 || (meta?.jointIds?.length ?? 0) > 0;
    if (!hasMateGraph) return false;
    if (partId !== undefined && meta?.partIds?.includes(partId)) return true;
    if (partId !== undefined && featureRefTargetsPart(record.inputs, partId)) return true;
    return meta?.mates?.some(
        (mate) =>
            connectorRefPartName(mate.a) === partName
            || connectorRefPartName(mate.b) === partName,
    ) === true;
}

/**
 * True when the anchored part is driven by the assembly's pose graph, so a
 * local `.translate(...)` drag would be silently overwritten (or produce an
 * invalid scene) and must be refused.
 *
 * Three signals, each fail-safe:
 * (a) legacy `.connect()` placement stored as `metadata.placedBy` on the part;
 * (b) the part record is an input of an `assemblyJoint` / `assemblyConnect`
 *     primitive (joint-FK or connect-FK drives it);
 * (c) the part is a member of a `solvedAssembly` / `assemblyModel` record
 *     that carries mates or joints — including the FK root, because
 *     "when in doubt, refuse" beats staging an invalid edit.
 */
export function isMatedAnchor(
    features: readonly FeatureRecord[],
    anchor: DirectEditAnchor,
): boolean {
    if (anchor.kind !== 'part') return false;

    const partRecord = findPartRecord(features, anchor.name);
    const partId = partRecord?.id;

    // (a) legacy connect() placement.
    if (hasLegacyConnectPlacement(partRecord)) return true;

    for (const record of features) {
        // (b) joint / connect primitives name the part in their inputs.
        if (record.kind === 'assemblyJoint' || record.kind === 'assemblyConnect') {
            if (jointOrConnectDrivesPart(record, partId, anchor.name)) return true;
            continue;
        }
        // (c) member of a mated/jointed assembly model.
        if (record.kind !== 'solvedAssembly' && record.kind !== 'assemblyModel') continue;
        if (mateGraphDrivesPart(record, partId, anchor.name)) return true;
    }

    return false;
}
