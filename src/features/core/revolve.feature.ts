import { RevolveIcon } from '../../components/CustomIcons';
import { type Feature } from '../types';
import { type CodeGenerationContext } from '../../lib/codeGeneration';

export const RevolveFeature: Feature = {
    id: 'revolve',
    label: 'Revolve',
    icon: RevolveIcon,
    description: 'Rotate a sketch around an axis to create a solid',
    shortcut: 'r',
    execute: (context) => {
        context.openPanel('revolve');
    }
};

export const generateRevolveCode = (context: CodeGenerationContext, sketchName: string, angle: number, axis: string): string => {
    let axisVector = '[1, 0, 0]';
    if (axis === 'Y') axisVector = '[0, 1, 0]';
    if (axis === 'Z') axisVector = '[0, 0, 1]';

    const resultName = context.generateUniqueName(`revolved_${sketchName.replace(/sketch/i, '').replace(/^_+/, '')}`);
    return `const ${resultName} = ${sketchName}.revolve(${angle}, ${axisVector});`;
};
