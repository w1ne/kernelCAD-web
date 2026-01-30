import { LayoutTemplate, PenTool, Scissors } from 'lucide-react';
import { type Feature } from '../types';
import { CodeBuilder } from '../../lib/CodeBuilder';

export const FilletFeature: Feature = {
    id: 'fillet',
    label: 'Fillet',
    icon: LayoutTemplate,
    description: 'Round the edges of the selected shape',
    execute: (context) => {
        context.setActiveDialog('fillet');
    }
};

export const generateFilletCode = (targetName: string, radius: number, filterType: string): string => {
    const builder = new CodeBuilder();
    let filterArg = '';

    if (filterType === 'vertical') {
        filterArg = `, (e) => e.inDirection('Z')`;
    } else if (filterType === 'horizontal') {
        filterArg = `, (e) => !e.inDirection('Z')`;
    }

    const resultName = builder.getUniqueName(`${targetName}_filleted`);
    builder.addStatement(`const ${resultName} = ${targetName}.fillet(${radius}${filterArg});`);
    return builder.toString();
};

export const ChamferFeature: Feature = {
    id: 'chamfer',
    label: 'Chamfer',
    icon: PenTool,
    description: 'Bevel the edges of the selected shape',
    execute: (context) => {
        context.setActiveDialog('chamfer');
    }
};

export const generateChamferCode = (targetName: string, distance: number, filterType: string): string => {
    const builder = new CodeBuilder();
    let filterArg = '';

    if (filterType === 'vertical') {
        filterArg = `, (e) => e.inDirection('Z')`;
    } else if (filterType === 'horizontal') {
        filterArg = `, (e) => !e.inDirection('Z')`;
    }

    const resultName = builder.getUniqueName(`${targetName}_chamfered`);
    builder.addStatement(`const ${resultName} = ${targetName}.chamfer(${distance}${filterArg});`);
    return builder.toString();
};

export const CutFeature: Feature = {
    id: 'cut',
    label: 'Cut',
    icon: Scissors,
    description: 'Subtract one shape from another',
    execute: (context) => {
        context.setActiveDialog('cut');
    }
};

export const UnionFeature: Feature = {
    id: 'union',
    label: 'Join',
    icon: LayoutTemplate, // Temporarily using LayoutTemplate, might change later
    description: 'Fuse two shapes together',
    execute: (context) => {
        context.setActiveDialog('union');
    }
};

export const IntersectFeature: Feature = {
    id: 'intersect',
    label: 'Intersect',
    icon: PenTool, // Temporarily using PenTool, might change later
    description: 'Common volume of two shapes',
    execute: (context) => {
        context.setActiveDialog('intersect');
    }
};

export const generateBooleanCode = (baseName: string, toolName: string, type: 'fuse' | 'cut' | 'intersect'): string => {
    const builder = new CodeBuilder();
    // Special naming for boolean op result usually appends operation
    const resultName = builder.getUniqueName(`${baseName}_${type}`);
    builder.addStatement(`const ${resultName} = ${baseName}.${type}(${toolName});`);
    return builder.toString();
};
