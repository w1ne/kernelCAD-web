// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type * as THREE from "three";
import { useMemo } from "react";
import type { GeometryResult } from "../../../../shared/worker/geometryEngine";
import type { ViewMode3D } from "../../../../shared/types/viewMode";
import { Shape } from "../entities/ShapeGeometry";
import { InstancedShape } from "../entities/InstancedShape";
import { groupForInstancing, visibleEntries } from "../instancing/groupForInstancing";
import { NO_PLANES } from "../../../hooks/viewer/useViewerSectionClipping";
import { useWorkbench } from "../../../context/WorkbenchContext";

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
 * Renders every computed geometry, applying per-part hide and keep-whole
 * section rules; repeated assembly geometry renders instanced (see
 * instancing/groupForInstancing.ts). Parts are named by their authored
 * assembly part name first, then the return-variable name, so selection
 * and the marking overlay's `ownerId` never fall back to `shape#<index>`
 * for assembly parts.
 */
export function GeometryLayer({
    geometries, itemNames, hiddenIds, viewMode3D, selectedItemIds, sectionKeepWhole, clippingPlanes,
}: GeometryLayerProps) {
    const { selectedFace } = useWorkbench();
    const { singles, groups } = useMemo(() => groupForInstancing(visibleEntries({
        geometries, itemNames, hiddenIds, selectedItemIds, sectionKeepWhole,
        selectedFaceShapeIndex: selectedFace?.shapeIndex,
    })), [geometries, itemNames, hiddenIds, selectedItemIds, sectionKeepWhole, selectedFace?.shapeIndex]);
    return (
        <group>
            {singles.map((e) => (
                <Shape
                    key={e.shapeIndex}
                    geometry={e.geometry}
                    shapeIndex={e.shapeIndex}
                    viewMode3D={viewMode3D}
                    clippingPlanes={e.keepWhole ? NO_PLANES : clippingPlanes}
                    clipIntersection={true}
                    isSelected={e.isSelected}
                    name={e.name}
                />
            ))}
            {groups.map((g) => (
                <InstancedShape
                    key={`${g.key}:${g.members.length}`}
                    group={g}
                    viewMode3D={viewMode3D}
                    clippingPlanes={g.members[0].keepWhole ? NO_PLANES : clippingPlanes}
                    clipIntersection={true}
                />
            ))}
        </group>
    );
}
