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
