// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import type { GeometryResult } from '../../shared/worker/workerTypes';
import type { FeatureRecord } from '../../shared/intent/featureRecord';
import { CAD_COLORS, faceOverlayColor } from '../../shared/constants/colors';
import { HoverManager } from '../features-ui/interaction/HoverManager';
import { SnapManager } from '../features-ui/interaction/SnapManager';
import { hoverToPick } from '../hooks/viewer/useViewerInteraction';
import { edgeIndexAtVertex, facesForTargets, highlightTargets, pickOwner, resolvePickFeature } from './geometryLineage';

function face(faceId: number) {
    return {
        faceId,
        vertices: new Float32Array(9),
        normals: new Float32Array(9),
        indices: new Uint32Array([0, 1, 2]),
    };
}

function geometry(owners: string[] | undefined, extra: Partial<GeometryResult> = {}): GeometryResult {
    return {
        faces: [face(0), face(1), face(2)],
        featureId: 'hole_1',
        ...(owners ? { faceOwners: owners } : {}),
        ...extra,
    };
}

describe('geometryLineage', () => {
    it('face / edge → owner, falling back to the mesh feature', () => {
        const g = geometry(['box_1', 'fillet_1', 'hole_1'], {
            edgeRanges: [0, 2, 2, 4],
            edgeOwners: ['box_1', 'hole_1'],
        });
        expect(pickOwner(g, { shapeIndex: 0, kind: 'face', id: 1 })).toBe('fillet_1');
        expect(pickOwner(g, { shapeIndex: 0, kind: 'edge', id: 1 })).toBe('hole_1');
        const partLevel = geometry(undefined);
        expect(pickOwner(partLevel, { shapeIndex: 0, kind: 'face', id: 2 })).toBe('hole_1');
        expect(pickOwner({ faces: [] }, { shapeIndex: 0, kind: 'face', id: 0 })).toBeNull();
    });

    it('segment vertex → edge index', () => {
        const ranges = [0, 2, 2, 6, 8, 2];
        expect(edgeIndexAtVertex(ranges, 0)).toBe(0);
        expect(edgeIndexAtVertex(ranges, 2)).toBe(1);
        expect(edgeIndexAtVertex(ranges, 7)).toBe(1);
        expect(edgeIndexAtVertex(ranges, 8)).toBe(2);
        expect(edgeIndexAtVertex(ranges, 10)).toBe(-1);
        expect(edgeIndexAtVertex(undefined, 0)).toBe(-1);
    });

    it('code targets → faces: face-level, whole-feature fallback, and whole part', () => {
        const none: FeatureRecord[] = [];
        expect(facesForTargets(geometry(['box_1', 'fillet_1', 'box_1']), highlightTargets(['box_1'], none))).toEqual([0, 2]);
        expect(facesForTargets(geometry(undefined), highlightTargets(['hole_1'], none))).toEqual([0, 1, 2]);
        expect(facesForTargets(geometry(undefined), highlightTargets(['box_1'], none))).toEqual([]);
        const part: FeatureRecord = {
            id: 'assemblyPart_1', kind: 'assemblyPart', inputs: {}, params: {}, transforms: [],
            suppressed: false, metadata: { partName: 'arm' },
        };
        const armMesh = geometry(undefined, { featureId: 'solvedAssembly_1::arm', assemblyPartName: 'arm' });
        expect(facesForTargets(armMesh, highlightTargets(['assemblyPart_1'], [part]))).toEqual([0, 1, 2]);
    });

    it('lookups are cached per evaluation and invalidate on re-evaluation', () => {
        const first = geometry(['box_1', 'fillet_1', 'box_1']);
        const targets = highlightTargets(['fillet_1'], []);
        expect(facesForTargets(first, targets)).toEqual([1]);
        // The cache is keyed on the geometry object: the same evaluation
        // keeps its index even if someone mutates the array afterwards...
        first.faceOwners![2] = 'fillet_1';
        expect(facesForTargets(first, targets)).toEqual([1]);
        // ...and a re-evaluation (new geometry objects) is indexed afresh.
        const second = geometry(['box_1', 'fillet_1', 'fillet_1']);
        expect(facesForTargets(second, targets)).toEqual([1, 2]);
    });
});

describe('viewer picking and colours', () => {
    it('pre-select (hover) and click-select colours are distinct', () => {
        expect(faceOverlayColor(true)).toBe(CAD_COLORS.selection);
        expect(faceOverlayColor(false)).toBe(CAD_COLORS.highlight);
        expect(faceOverlayColor(false)).not.toBe(faceOverlayColor(true));
        expect(CAD_COLORS.codeLink).not.toBe(CAD_COLORS.selection);
        expect(CAD_COLORS.codeLink).not.toBe(CAD_COLORS.highlight);
    });

    it('hovering a shape BREP edge resolves the single edge, without a snap', () => {
        const lines = new THREE.LineSegments(new THREE.BufferGeometry());
        lines.userData = { type: 'EDGE', id: 'edges', shapeIndex: 3, edgeRanges: [0, 2, 2, 4] };
        const mesh = new THREE.Mesh();
        mesh.userData = { type: 'FACE', id: 'consolidated', shapeIndex: 3, faceMap: [5] };
        const hover = HoverManager.getBestHover([
            { object: mesh, distance: 10, point: new THREE.Vector3(), faceIndex: 0 } as THREE.Intersection,
            { object: lines, distance: 10.05, point: new THREE.Vector3(), index: 4 } as THREE.Intersection,
        ]);
        expect(hover?.type).toBe('EDGE');
        expect(hover?.id).toBe(1);
        expect(hoverToPick(hover)).toEqual({ shapeIndex: 3, kind: 'edge', id: 1 });
        expect(SnapManager.getSnapFromHover(hover)).toBeNull();

        const faceHover = HoverManager.getBestHover([
            { object: mesh, distance: 10, point: new THREE.Vector3(), faceIndex: 0 } as THREE.Intersection,
        ]);
        expect(hoverToPick(faceHover)).toEqual({ shapeIndex: 3, kind: 'face', id: 5 });
    });

    it('hovering an instanced part resolves that instance\'s shapeIndex and owner', () => {
        const mesh = new THREE.Mesh();
        mesh.userData = { type: 'FACE', id: 'consolidated', faceMap: [5], instanceShapeIndices: [3, 8], instanceParts: ['rack-0', 'rack-1'] };
        const hover = HoverManager.getBestHover([
            { object: mesh, distance: 10, point: new THREE.Vector3(), faceIndex: 0, instanceId: 1 } as THREE.Intersection,
        ]);
        expect(hover?.ownerId).toBe('rack-1');
        expect(hoverToPick(hover)).toEqual({ shapeIndex: 8, kind: 'face', id: 5 });
    });

    it('hovering an instanced BREP edge resolves the edge on that instance only', () => {
        const lines = new THREE.LineSegments(new THREE.BufferGeometry());
        lines.userData = {
            type: 'EDGE', id: 'edges', edgeRanges: [0, 2, 2, 4],
            instanceShapeIndices: [3, 8, 11], instanceParts: ['rack-0', 'rack-1', 'rack-2'],
        };
        const hover = HoverManager.getBestHover([
            { object: lines, distance: 10, point: new THREE.Vector3(), index: 4, instanceId: 2 } as THREE.Intersection,
        ]);
        expect(hover).toMatchObject({ type: 'EDGE', id: 1, shapeIndex: 11, ownerId: 'rack-2', instanceId: 2 });
        expect(hoverToPick(hover)).toEqual({ shapeIndex: 11, kind: 'edge', id: 1 });
    });
});

describe('resolvePickFeature', () => {
    it('falls back from a synthetic part mesh id to its assemblyPart record', () => {
        const part: FeatureRecord = {
            id: 'assemblyPart_1', kind: 'assemblyPart', inputs: {}, params: {}, transforms: [],
            suppressed: false, metadata: { partName: 'arm' },
        };
        const box: FeatureRecord = { ...part, id: 'box_1', kind: 'box', metadata: {} };
        const armMesh = geometry(undefined, { featureId: 'solvedAssembly_1__arm', assemblyPartName: 'arm' });
        expect(resolvePickFeature(armMesh, { shapeIndex: 0, kind: 'face', id: 0 }, [box, part])).toBe('assemblyPart_1');
        const owned = geometry(['box_1', 'box_1', 'box_1'], { featureId: 'solvedAssembly_1__arm', assemblyPartName: 'arm' });
        expect(resolvePickFeature(owned, { shapeIndex: 0, kind: 'face', id: 1 }, [box, part])).toBe('box_1');
    });
});
