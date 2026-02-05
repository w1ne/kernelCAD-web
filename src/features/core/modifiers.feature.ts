import { SquaresIntersect, SquaresSubtract, SquaresUnite } from 'lucide-react';
import { type Feature } from '../types';
import { type CodeGenerationContext } from '../../lib/codeGeneration';
import { FilletIcon, ChamferIcon } from '../../components/CustomIcons';

export const FilletFeature: Feature = {
    id: 'fillet',
    label: 'Fillet',
    icon: FilletIcon,
    description: 'Round the edges of the selected shape',
    execute: (context) => {
        context.setActiveDialog('fillet');
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
    execute: (context) => {
        context.setActiveDialog('chamfer');
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
    execute: (context) => {
        context.setActiveDialog('cut');
    }
};

export const UnionFeature: Feature = {
    id: 'union',
    label: 'Join',
    icon: SquaresUnite,
    description: 'Fuse two shapes together',
    execute: (context) => {
        context.setActiveDialog('union');
    }
};

export const IntersectFeature: Feature = {
    id: 'intersect',
    label: 'Intersect',
    icon: SquaresIntersect,
    description: 'Common volume of two shapes',
    execute: (context) => {
        context.setActiveDialog('intersect');
    }
};

export const generateBooleanCode = (context: CodeGenerationContext, baseName: string, toolName: string, type: 'fuse' | 'cut' | 'intersect'): string => {
    const resultName = context.generateUniqueName(`${baseName}_${type}`);
    return `const ${resultName} = ${baseName}.${type}(${toolName});`;
};
