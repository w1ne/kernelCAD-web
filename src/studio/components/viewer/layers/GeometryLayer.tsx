// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type * as THREE from "three";
import type { GeometryResult } from "../../../../shared/worker/geometryEngine";
import type { ViewMode3D } from "../../../../shared/types/viewMode";
import { Shape } from "../entities/ShapeGeometry";
import { sectionPartKey } from "../sectionParts";
import { NO_PLANES } from "../../../hooks/viewer/useViewerSectionClipping";

interface GeometryLayerProps {
    geometries: GeometryResult[];
    itemNames: (string | null)[];
    hiddenIds: string[];
    viewMode3D: ViewMode3D;
    selectedItemIds: string[];
    sectionKeepWhole: ReadonlySet<string>;
    clippingPlanes: THREE.Plane[];
}

/**
 * Renders every computed geometry as a shape, applying per-part hide and
 * keep-whole section rules. Extracted verbatim from Viewer.
 */
export function GeometryLayer({
    geometries,
    itemNames,
    hiddenIds,
    viewMode3D,
    selectedItemIds,
    sectionKeepWhole,
    clippingPlanes,
}: GeometryLayerProps) {
    return (
        <group>
            {geometries.map((g, i) => {
                // Prefer the authored assembly part name over the
                // return-variable name. For assemblies a single returned
                // variable expands into many per-part geometries, so
                // `itemNames[i]` is absent for all but the first — using
                // it alone leaves parts anonymous and downstream consumers
                // (selection, the marking/review overlay's `ownerId`) fall
                // back to `shape#<index>`. `assemblyPartName` carries the
                // real authored name per part. Mirrors `sectionPartKey`.
                const name = g.assemblyPartName ?? itemNames[i];
                if (name && hiddenIds.includes(name)) return null;
                // Hide whole assembly parts by name (the Parts list in the
                // Scene tab toggles `assemblyPartName` into hiddenIds).
                if (g.assemblyPartName && hiddenIds.includes(g.assemblyPartName)) return null;
                const partKey = sectionPartKey(g, name, i);
                return (
                    <Shape
                        key={i}
                        geometry={g}
                        shapeIndex={i}
                        viewMode3D={viewMode3D}
                        clippingPlanes={sectionKeepWhole.has(partKey) ? NO_PLANES : clippingPlanes}
                        clipIntersection={true}
                        isSelected={name ? selectedItemIds.includes(name) : false}
                        name={name ?? undefined}
                    />
                );
            })}
        </group>
    );
}
