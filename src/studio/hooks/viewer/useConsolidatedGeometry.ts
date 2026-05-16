import * as THREE from "three";
import { useMemo } from "react";
import type { FaceGeometry } from "../../../shared/worker/geometryEngine";

export function useConsolidatedGeometry(faces: FaceGeometry[]) {
    return useMemo(() => {
        if (faces.length === 0) return { geometry: null, faceMap: null };
        let totalVertices = 0;
        let totalIndices = 0;
        faces.forEach(f => {
            totalVertices += f.vertices.length;
            totalIndices += f.indices.length;
        });

        const positionArray = new Float32Array(totalVertices);
        const normalArray = new Float32Array(totalVertices);
        const indexArray = new Uint32Array(totalIndices);
        const faceMap = new Int32Array(totalIndices / 3);

        let currentVertexOffset = 0;
        let vertexCountOffset = 0;
        let indexOffset = 0;
        let triangleIndexOffset = 0;

        faces.forEach(f => {
            positionArray.set(f.vertices, currentVertexOffset);
            normalArray.set(f.normals, currentVertexOffset);
            const numVertices = f.vertices.length / 3;
            for (let i = 0; i < f.indices.length; i++) {
                indexArray[indexOffset + i] = f.indices[i] + vertexCountOffset;
            }
            const numTriangles = f.indices.length / 3;
            for (let i = 0; i < numTriangles; i++) {
                faceMap[triangleIndexOffset + i] = f.faceId;
            }
            currentVertexOffset += f.vertices.length;
            vertexCountOffset += numVertices;
            indexOffset += f.indices.length;
            triangleIndexOffset += numTriangles;
        });

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positionArray, 3));
        geometry.setAttribute('normal', new THREE.BufferAttribute(normalArray, 3));
        geometry.setIndex(new THREE.BufferAttribute(indexArray, 1));

        return { geometry, faceMap };
    }, [faces]);
}
