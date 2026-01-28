import { MousePointer2 } from 'lucide-react';
import { type Feature } from '../types';

export const SketchOnFaceFeature: Feature = {
    id: 'sketchOnFace',
    label: 'Sketch on Face',
    icon: MousePointer2,
    description: 'Start a new sketch on the selected planar face',
    execute: (context) => {
        context.setActiveDialog('sketchOnFace');
    }
};

export const generateSketchOnFaceCode = (targetName: string, faceId: number, sketchName: string): string => {
    // Generate code using Stable Reference pattern (Parametric Plane)
    // We create a Plane dynamically from the face, then attach the sketcher to it.
    const planeName = `plane_${sketchName}`;
    return `
const ${planeName} = new replicad.Plane(${targetName}.faces[${faceId}].center, ${targetName}.faces[${faceId}].normal);
const ${sketchName} = new Sketcher(${planeName});
`.trim();
};
