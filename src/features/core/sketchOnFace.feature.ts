import { MousePointer2 } from 'lucide-react';
import { type Feature } from '../types';

export const SketchOnFaceFeature: Feature = {
    id: 'sketchOnFace',
    label: 'Sketch on Face',
    icon: MousePointer2,
    description: 'Start a new sketch on the selected planar face',
    execute: () => {
        // This will be handled by a specific logic in the toolbar/workbench
        // but we define it here for completeness
    }
};

export const generateSketchOnFaceCode = (targetName: string, faceId: number): string => {
    const sketchName = `sketchFrom${targetName}Face${faceId}`;
    return `\nconst ${sketchName} = ${targetName}.sketchOnFace(${faceId});`;
};
