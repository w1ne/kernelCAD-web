export type PlaneType = 'base' | 'offset' | 'face' | 'angle';

export interface SketchPlaneEntity {
    id: string;
    name: string;
    type: PlaneType;
    origin: [number, number, number];
    normal: [number, number, number];
    visible: boolean;
    parentId?: string; // ID of the shape it's derived from (if any)
}
