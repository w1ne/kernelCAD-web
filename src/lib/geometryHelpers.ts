import * as replicad from "replicad";

export const startSketch = () => new replicad.Sketcher();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const makeCompound = (shapes: any[]) => {
    return replicad.compoundShapes(shapes);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const fillet = (shape: any, radius: number, filter?: any) => {
    if (shape.fillet) return shape.fillet(radius, filter);
    throw new Error("Shape does not support fillet");
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const chamfer = (shape: any, distance: number, filter?: any) => {
    if (shape.chamfer) return shape.chamfer(distance, filter);
    throw new Error("Shape does not support chamfer");
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const sketchOnFace = (shape: any, faceId: number) => {
    // Try native method first if it exists
    if (typeof shape.sketchOnFace === 'function') {
        return shape.sketchOnFace(faceId);
    }

    // Fallback: Return the face directly (it supports .extrude)
    if (!shape.faces || !shape.faces[faceId]) {
        throw new Error(`Face ${faceId} not found on shape`);
    }
    return shape.faces[faceId];
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const extrude = (profile: any, distance: number) => {
    // If it has extrude method (like Sketch), use it
    if (typeof profile.extrude === 'function') {
        return profile.extrude(distance);
    }

    // Handle Face extrusion by creating a Sketch on the face's plane
    let plane = profile.planarPlane || profile.plane;

    // Fallback: Construct plane manually if missing but face is planar
    if (!plane && (profile.geomType === 'PLANE' || profile.geomType === 'Planar')) {
        const center = typeof profile.center === 'function' ? profile.center() : profile.center;
        const normal = profile.normalAt(center);
        plane = new replicad.Plane(center, normal);
    }

    if (plane) {
        // Convert face to Drawing to Sketch
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const drawing = (replicad as any).drawFaceOutline(profile);
        return drawing.sketchOnPlane(plane).extrude(distance);
    }

    throw new Error(`Cannot extrude object (type: ${profile.geomType || 'unknown'}): missing 'plane'. Try reloading or use a simplified shape.`);
};
