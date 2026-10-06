// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Which display geometries render as one THREE.InstancedMesh. Only parts
// with the same geometryId AND appearance AND section state share a group,
// and only groups of 2+; a selected part (or the part owning the selected
// face) renders standalone so selection colour and face overlays stay
// per-part. Scenes without geometryId render exactly as before.
import type { GeometryResult } from '../../../../shared/worker/geometryEngine';
import { sectionPartKey } from '../sectionParts';

export interface DisplayEntry {
    readonly geometry: GeometryResult;
    readonly shapeIndex: number;
    readonly name: string | undefined;
    readonly keepWhole: boolean;
    readonly isSelected: boolean;
    readonly standalone: boolean;
}

export interface InstanceGroup {
    readonly key: string;
    readonly members: readonly DisplayEntry[];
}

export function visibleEntries(args: {
    geometries: GeometryResult[];
    itemNames: (string | null)[];
    hiddenIds: string[];
    selectedItemIds: string[];
    sectionKeepWhole: ReadonlySet<string>;
    selectedFaceShapeIndex: number | undefined;
}): DisplayEntry[] {
    const out: DisplayEntry[] = [];
    args.geometries.forEach((geometry, i) => {
        // Same naming rule GeometryLayer always used (assembly part name first).
        const name = geometry.assemblyPartName ?? args.itemNames[i] ?? undefined;
        if (name && args.hiddenIds.includes(name)) return;
        const isSelected = name ? args.selectedItemIds.includes(name) : false;
        out.push({
            geometry,
            shapeIndex: i,
            name,
            keepWhole: args.sectionKeepWhole.has(sectionPartKey(geometry, name, i)),
            isSelected,
            standalone: isSelected || args.selectedFaceShapeIndex === i,
        });
    });
    return out;
}

export function materialKey(g: GeometryResult): string {
    return JSON.stringify([g.color ?? null, g.material ?? null]);
}

export function groupForInstancing(entries: readonly DisplayEntry[]): { singles: DisplayEntry[]; groups: InstanceGroup[] } {
    const buckets = new Map<string, DisplayEntry[]>();
    const singles: DisplayEntry[] = [];
    for (const e of entries) {
        const id = e.geometry.geometryId;
        if (id === undefined || e.standalone) {
            singles.push(e);
            continue;
        }
        const key = `${id}|${materialKey(e.geometry)}|${e.keepWhole ? 1 : 0}`;
        const list = buckets.get(key);
        if (list === undefined) buckets.set(key, [e]);
        else list.push(e);
    }
    const groups: InstanceGroup[] = [];
    for (const [key, members] of buckets) {
        if (members.length < 2) singles.push(...members);
        else groups.push({ key, members });
    }
    singles.sort((a, b) => a.shapeIndex - b.shapeIndex);
    return { singles, groups };
}
