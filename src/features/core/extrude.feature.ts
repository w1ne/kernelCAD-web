import { ArrowUpToLine } from 'lucide-react';
import { type Feature } from '../types';
import { type CodeGenerationContext } from '../../lib/codeGeneration';

export const ExtrudeFeature: Feature = {
    id: 'extrude',
    label: 'Extrude',
    icon: ArrowUpToLine,
    description: 'Extrude a sketch into a 3D solid',
    execute: (context) => {
        context.setActiveDialog('extrude');
    }
};

export const generateExtrudeCode = (context: CodeGenerationContext, sketchName: string, distance: number, direction: 'default' | 'reversed' = 'default'): string => {
    const finalDistance = direction === 'reversed' ? -distance : distance;
    const resultName = context.generateUniqueName(`extruded_${sketchName.replace(/sketch/i, '').replace(/^_+/, '')}`);
    return `const ${resultName} = ${sketchName}.extrude(${finalDistance});`;
};
