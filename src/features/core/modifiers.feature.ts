import { SquaresIntersect, SquaresSubtract, SquaresUnite } from 'lucide-react';
import { type Feature } from '../types';
import { type CodeGenerationContext } from '../../lib/codeGeneration';
import { FilletIcon, ChamferIcon } from '../../components/CustomIcons';

export const FilletFeature: Feature = {
    id: 'fillet',
    label: 'Fillet',
    icon: FilletIcon,
    description: 'Round the edges of the selected shape',
    shortcut: 'f',
    execute: (context) => {
        context.openPanel('fillet');
    }
};

export const generateFilletCode = (context: CodeGenerationContext, targetName: string, radius: number, filterType: string): string => {
    let filterArg = '';

    if (filterType === 'vertical') {
        filterArg = `, (e) => e.inDirection('Z')`;
    } else if (filterType === 'horizontal') {
        filterArg = `, (e) => !e.inDirection('Z')`;
    }

    const resultName = context.generateUniqueName(`${targetName}_filleted`);
    return `const ${resultName} = ${targetName}.fillet(${radius}${filterArg});`;
};

export const ChamferFeature: Feature = {
    id: 'chamfer',
    label: 'Chamfer',
    icon: ChamferIcon,
    description: 'Bevel the edges of the selected shape',
    shortcut: 'c',
    execute: (context) => {
        context.openPanel('chamfer');
    }
};

export const generateChamferCode = (context: CodeGenerationContext, targetName: string, distance: number, filterType: string): string => {
    let filterArg = '';

    if (filterType === 'vertical') {
        filterArg = `, (e) => e.inDirection('Z')`;
    } else if (filterType === 'horizontal') {
        filterArg = `, (e) => !e.inDirection('Z')`;
    }

    const resultName = context.generateUniqueName(`${targetName}_chamfered`);
    return `const ${resultName} = ${targetName}.chamfer(${distance}${filterArg});`;
};

export const CutFeature: Feature = {
    id: 'cut',
    label: 'Cut',
    icon: SquaresSubtract,
    description: 'Subtract one shape from another',
    shortcut: 'x',
    execute: (context) => {
        context.openPanel('cut');
    }
};

export const UnionFeature: Feature = {
    id: 'union',
    label: 'Union',
    icon: SquaresUnite,
    description: 'Fuse two shapes together',
    shortcut: 'j',
    execute: (context) => {
        context.openPanel('union');
    }
};

export const IntersectFeature: Feature = {
    id: 'intersect',
    label: 'Intersect',
    icon: SquaresIntersect,
    description: 'Common volume of two shapes',
    shortcut: 'i',
    execute: (context) => {
        context.openPanel('intersect');
    }
};

export const generateBooleanCode = (context: CodeGenerationContext, baseName: string, toolName: string, type: 'fuse' | 'cut' | 'intersect'): string => {
    const resultName = context.generateUniqueName(`${baseName}_${type}`);
    return `const ${resultName} = ${baseName}.${type}(${toolName});`;
};
