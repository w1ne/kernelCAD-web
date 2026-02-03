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

// Helper to find a stable planar face
export const findPlanarFace = (shape: any) => {
    if (!shape.faces) throw new Error("Shape has no faces");
    for (let i = 0; i < shape.faces.length; i++) {
        const face = shape.faces[i];
        if (face.geomType === 'PLANE' || face.geomType === 'Planar') {
            return { face, index: i };
        }
    }
    throw new Error("No planar face found on shape");
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

    // Check if face is planar
    const face = shape.faces[faceId];
    console.log(`Helper: Checking face ${faceId}. GeomType: ${face.geomType}`);
    if (face.geomType && face.geomType !== 'PLANE' && face.geomType !== 'Planar') {
        throw new Error(`Cannot sketch on non-planar face (type: ${face.geomType}). Stick to flat surfaces.`);
    }

    // Return a Sketcher on the face's plane
    const plane = replicad.makePlaneFromFace(face);
    return new replicad.Sketcher(plane);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const extrude = (profile: any, distance: number) => {
    // If it is a Sketcher or has the property, check for wire first if possible
    // or rely on a try-catch for the specific Replicad error
    try {
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
            plane = new replicad.Plane(center, null, normal);
        }

        if (plane) {
            // Convert face to Drawing to Sketch
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const drawing = (replicad as any).drawFaceOutline(profile);
            return drawing.sketchOnPlane(plane).extrude(distance);
        }

        throw new Error(`Cannot extrude non-planar object (type: ${profile.geomType || 'unknown'}). Please select a flat face.`);
    } catch (e: any) {
        const isSketcherInstance = profile && (typeof profile.done === 'function' || typeof profile.sketch === 'object');
        if (isSketcherInstance || (e.message && e.message.includes("No lines to convert into a wire"))) {
            throw new Error("Extrusion failed: The sketch is empty or contains invalid geometry. Please draw some geometry before extruding.");
        }
        throw e;
    }
};
