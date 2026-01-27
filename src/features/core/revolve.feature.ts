import { RefreshCw } from 'lucide-react';
import { type Feature } from '../types';

export const RevolveFeature: Feature = {
    id: 'revolve',
    label: 'Revolve',
    icon: RefreshCw,
    description: 'Rotate a sketch around an axis to create a solid',
    execute: (context) => {
        context.setActiveDialog('revolve');
    }
};

export const generateRevolveCode = (sketchName: string, angle: number, axis: string): string => {
    let axisVector = '[1, 0, 0]';
    if (axis === 'Y') axisVector = '[0, 1, 0]';
    if (axis === 'Z') axisVector = '[0, 0, 1]';

    return `\nconst revolved${sketchName.replace(/sketch/i, '')} = ${sketchName}.revolve(${angle}, ${axisVector});`;
};
