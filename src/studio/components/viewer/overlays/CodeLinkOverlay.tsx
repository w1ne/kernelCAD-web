// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useSharedSelection } from "../../../selectionCode/useSharedSelection";
import { useEffect, useMemo } from "react";
import type { GeometryResult } from "../../../../shared/worker/geometryEngine";
import type { FeatureRecord } from "../../../../shared/intent/featureRecord";
import { CAD_COLORS, CAD_COLORS_HEX } from "../../../../shared/constants/colors";
import { useWorkbench } from "../../../context/WorkbenchContext";
import { useSelectionCodeState } from "../../../selectionCode/selectionCodeStore";
import {
    facesForTargets,
    highlightTargets,
    type GeometryPick,
    type HighlightTargets,
} from "../../../selectionCode/geometryLineage";
import { matrixFromGeometryTransform } from "../entities/geometryTransform";
import { EdgeRangeLines } from "./EdgeRangeLines";
import { mergeFaces } from "./mergeFaces";
import { FaceSelectionOverlay } from "../entities/ShapeGeometry";

function CodeHighlightFaces({ geometry, targets }: { geometry: GeometryResult; targets: HighlightTargets }) {
    const merged = useMemo(() => {
        const ids = new Set(facesForTargets(geometry, targets));
        if (ids.size === 0) return null;
        return mergeFaces(geometry.faces.filter((f) => ids.has(f.faceId)));
    }, [geometry, targets]);
    useEffect(() => () => { merged?.dispose(); }, [merged]);
    const transformMatrix = useMemo(() => matrixFromGeometryTransform(geometry), [geometry]);
    if (!merged) return null;
    return (
        <group matrix={transformMatrix} matrixAutoUpdate={transformMatrix ? false : undefined}>
            <mesh geometry={merged} renderOrder={1000}>
                <meshBasicMaterial
                    color={CAD_COLORS.codeLink}
                    transparent
                    opacity={0.55}
                    polygonOffset
                    polygonOffsetFactor={-1}
                />
            </mesh>
        </group>
    );
}

function SelectedTopology({ geometry, pick }: { geometry: GeometryResult | undefined; pick: GeometryPick }) {
    const transformMatrix = useMemo(() => (geometry ? matrixFromGeometryTransform(geometry) : undefined), [geometry]);
    if (!geometry) return null;
    if (pick.kind === 'edge') {
        if (!geometry.edges || !geometry.edgeRanges) return null;
        return <group matrix={transformMatrix} matrixAutoUpdate={transformMatrix ? false : undefined}>
            <EdgeRangeLines positions={geometry.edges} edgeRanges={geometry.edgeRanges} edgeIndex={pick.id} color={CAD_COLORS_HEX.selection} />
        </group>;
    }
    const face = geometry.faces.find(candidate => candidate.faceId === pick.id);
    return face ? <group matrix={transformMatrix} matrixAutoUpdate={transformMatrix ? false : undefined}>
        <FaceSelectionOverlay face={face} isSelected />
    </group> : null;
}

const NO_FEATURES: readonly FeatureRecord[] = [];

/**
 * Viewer half of the selection ↔ code link:
 *   - tints (code-link violet) the faces made by the feature(s) under the
 *     Code tab cursor or mouse; a part-level mapping tints the whole part;
 *   - draws a clicked BREP edge in the selection colour (a clicked face is
 *     already drawn by `ConsolidatedShape`).
 */
export function CodeLinkOverlay({ geometries, itemNames }: { geometries: GeometryResult[]; itemNames: (string | null)[] }) {
    const { topologySelections, codeHighlight } = useSelectionCodeState();
    const { featureRecords, hiddenIds, sessionToken, setSelectedFace, lastSuccessfulRevision } = useWorkbench();
    useSharedSelection(sessionToken, setSelectedFace, geometries, lastSuccessfulRevision);
    const features = featureRecords ?? NO_FEATURES;
    const targets = useMemo(
        () => (codeHighlight ? highlightTargets(codeHighlight, features) : null),
        [codeHighlight, features],
    );
    const isHidden = (g: GeometryResult, i: number): boolean => {
        const name = g.assemblyPartName ?? itemNames[i];
        return !!name && (hiddenIds ?? []).includes(name);
    };
    return (
        <group>
            {targets && geometries.map((g, i) => (
                isHidden(g, i) ? null : <CodeHighlightFaces key={i} geometry={g} targets={targets} />
            ))}
            {topologySelections.map((selection, index) => (
                <SelectedTopology key={`${selection.pick.shapeIndex}:${selection.pick.kind}:${selection.stableId ?? selection.pick.id}:${index}`}
                    geometry={geometries[selection.pick.shapeIndex]} pick={selection.pick} />
            ))}
        </group>
    );
}
