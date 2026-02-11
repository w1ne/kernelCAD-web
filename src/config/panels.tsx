import type { ComponentType } from 'react';
import { ExtrudePanel } from '../components/Panels/ExtrudePanel';
import { RevolvePanel } from '../components/Panels/RevolvePanel';
import { FilletPanel } from '../components/Panels/FilletPanel';
import { ChamferPanel } from '../components/Panels/ChamferPanel';
import { BooleanPanel } from '../components/Panels/BooleanPanel';
import { PlaneSelectorPanel } from '../components/Panels/PlaneSelectorPanel';
import { OffsetPlanePanel } from '../components/Panels/OffsetPlanePanel';
import { SketchOnFacePanel } from '../components/Panels/SketchOnFacePanel';
import { ExtrudeFromFacePanel } from '../components/Panels/ExtrudeFromFacePanel';
import { MidplanePanel } from '../components/Panels/MidplanePanel';
import { TangentPlanePanel } from '../components/Panels/TangentPlanePanel';

export interface PanelConfig {
    id: string;
    title: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    component: ComponentType<any>;
    props?: Record<string, unknown>;
    initialPosition: { x: number; y: number };
}

export const PANELS: Record<string, PanelConfig> = {
    extrude: {
        id: 'extrude',
        title: 'Extrude',
        component: ExtrudePanel,
        initialPosition: { x: 80, y: 80 }
    },
    revolve: {
        id: 'revolve',
        title: 'Revolve',
        component: RevolvePanel,
        initialPosition: { x: 100, y: 100 }
    },
    fillet: {
        id: 'fillet',
        title: 'Fillet',
        component: FilletPanel,
        initialPosition: { x: 120, y: 120 }
    },
    chamfer: {
        id: 'chamfer',
        title: 'Chamfer',
        component: ChamferPanel,
        initialPosition: { x: 140, y: 140 }
    },
    union: {
        id: 'union',
        title: 'Join (Union)',
        component: BooleanPanel,
        props: { type: 'fuse' },
        initialPosition: { x: 80, y: 80 }
    },
    cut: {
        id: 'cut',
        title: 'Cut (Subtract)',
        component: BooleanPanel,
        props: { type: 'cut' },
        initialPosition: { x: 100, y: 100 }
    },
    intersect: {
        id: 'intersect',
        title: 'Intersect',
        component: BooleanPanel,
        props: { type: 'intersect' },
        initialPosition: { x: 120, y: 120 }
    },
    planeSelector: {
        id: 'planeSelector',
        title: 'Select Sketch Plane',
        component: PlaneSelectorPanel,
        initialPosition: { x: 300, y: 150 }
    },
    offsetPlane: {
        id: 'offsetPlane',
        title: 'Construction Plane',
        component: OffsetPlanePanel,
        initialPosition: { x: 140, y: 140 }
    },
    sketchOnFace: {
        id: 'sketchOnFace',
        title: 'New Sketch',
        component: SketchOnFacePanel,
        initialPosition: { x: 160, y: 160 }
    },
    extrudeFromFace: {
        id: 'extrudeFromFace',
        title: 'Extrude',
        component: ExtrudeFromFacePanel,
        initialPosition: { x: 180, y: 180 }
    },
    midplane: {
        id: 'midplane',
        title: 'Midplane',
        component: MidplanePanel,
        initialPosition: { x: 200, y: 200 }
    },
    tangentPlane: {
        id: 'tangentPlane',
        title: 'Tangent Plane',
        component: TangentPlanePanel,
        initialPosition: { x: 220, y: 220 }
    }
};
