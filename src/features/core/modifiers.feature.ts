import { LayoutTemplate, PenTool, Scissors } from 'lucide-react';
import { type Feature } from '../types';

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
    let filterCode = '';
    if (filterType === 'vertical') {
        filterCode = `, (e) => e.inDirection('Z')`;
    } else if (filterType === 'horizontal') {
        filterCode = `, (e) => !e.inDirection('Z')`;
    }

    const resultName = `${targetName}_filleted`;
    return `\nconst ${resultName} = ${targetName}.fillet(${radius}${filterCode});`;
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
    let filterCode = '';
    if (filterType === 'vertical') {
        filterCode = `, (e) => e.inDirection('Z')`;
    } else if (filterType === 'horizontal') {
        filterCode = `, (e) => !e.inDirection('Z')`;
    }

    const resultName = `${targetName}_chamfered`;
    return `\nconst ${resultName} = ${targetName}.chamfer(${distance}${filterCode});`;
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
    const resultName = `${baseName}_${type}`;
    return `\nconst ${resultName} = ${baseName}.${type}(${toolName});`;
};
