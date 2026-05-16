import type { SketchPlaneEntity } from '../shared/types/plane';

type Vec3 = [number, number, number];

function cross(a: Vec3, b: Vec3): Vec3 {
    return [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0]
    ];
}

function normalize(v: Vec3): Vec3 | undefined {
    const n = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
    if (n < 1e-9) return undefined;
    return [v[0] / n, v[1] / n, v[2] / n];
}

export function deriveScreenAlignedXDir(normal: Vec3): Vec3 | undefined {
    const worldUp: Vec3 = [0, 1, 0];
    const altUp: Vec3 = [1, 0, 0];
    return normalize(cross(worldUp, normal)) ?? normalize(cross(altUp, normal));
}

export function buildFaceSketchPlaneEntity(params: {
    faceId: number;
    targetName?: string | null;
    origin: Vec3;
    normal: Vec3;
    xDir?: Vec3;
}): SketchPlaneEntity {
    const { faceId, targetName, origin, normal, xDir } = params;
    return {
        id: `face-${faceId}-${Date.now()}`,
        name: targetName ? `Face ${faceId} of ${targetName}` : `Face ${faceId}`,
        type: 'face',
        origin,
        normal,
        xDir: deriveScreenAlignedXDir(normal) ?? xDir,
        visible: true,
        parentId: targetName || undefined,
        faceId
    };
}

