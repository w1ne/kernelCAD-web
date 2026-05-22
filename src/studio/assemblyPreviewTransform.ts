import * as THREE from 'three';
import type { GeometryResult } from '../shared/worker/geometryEngine';
import type { JointPoseSnapshot } from './adapters/featureRecordsToMates';
import { matrixFromGeometryTransform } from './components/viewer/entities/geometryTransform';

export interface AssemblyPreviewTransform {
    readonly partName: string;
    readonly transform: number[];
}

function geometryMatrix(geometry: GeometryResult | undefined): THREE.Matrix4 {
    return geometry ? (matrixFromGeometryTransform(geometry) ?? new THREE.Matrix4()) : new THREE.Matrix4();
}

export function computeAssemblyPreviewTransform(
    snap: JointPoseSnapshot,
    geometries: readonly GeometryResult[],
    nextPose: number,
): AssemblyPreviewTransform | null {
    if (!snap.preview || typeof snap.pose !== 'number') return null;
    const delta = nextPose - snap.pose;
    if (!Number.isFinite(delta)) return null;

    const child = geometries.find((geometry) => geometry.assemblyPartName === snap.preview?.childPartName);
    if (!child) return null;
    const parent = geometries.find((geometry) => geometry.assemblyPartName === snap.preview?.parentPartName);
    const parentMatrix = geometryMatrix(parent);
    const childMatrix = geometryMatrix(child);

    const axis = new THREE.Vector3(...snap.preview.parentConnectorAxis)
        .transformDirection(parentMatrix)
        .normalize();
    if (axis.lengthSq() === 0) return null;

    const origin = new THREE.Vector3(...snap.preview.parentConnectorOrigin).applyMatrix4(parentMatrix);
    let deltaMatrix: THREE.Matrix4;
    switch (snap.mate.type) {
        case 'prismatic':
            deltaMatrix = new THREE.Matrix4().makeTranslation(axis.x * delta, axis.y * delta, axis.z * delta);
            break;
        case 'revolute':
        case 'cylindrical':
        case 'pin_slot': {
            const rotate = new THREE.Matrix4().makeRotationAxis(axis, THREE.MathUtils.degToRad(delta));
            deltaMatrix = new THREE.Matrix4()
                .makeTranslation(origin.x, origin.y, origin.z)
                .multiply(rotate)
                .multiply(new THREE.Matrix4().makeTranslation(-origin.x, -origin.y, -origin.z));
            break;
        }
        default:
            return null;
    }

    return {
        partName: snap.preview.childPartName,
        transform: deltaMatrix.multiply(childMatrix).toArray(),
    };
}
