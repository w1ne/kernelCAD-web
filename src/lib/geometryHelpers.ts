import * as replicad from "replicad";

export const startSketch = () => new replicad.Sketcher();

export const makeCompound = (shapes: any[]) => {
    return replicad.compoundShapes(shapes);
};

export const fillet = (shape: any, radius: number, filter?: any) => {
    if (shape.fillet) return shape.fillet(radius, filter);
    throw new Error("Shape does not support fillet");
};

export const chamfer = (shape: any, distance: number, filter?: any) => {
    if (shape.chamfer) return shape.chamfer(distance, filter);
    throw new Error("Shape does not support chamfer");
};
