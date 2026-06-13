// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { ExtrudeIcon } from '../../../shared/icons/CustomIcons';
import { type Feature } from '../types';
import { type CodeGenerationContext } from '../../../shared/codeGeneration/index';

export const ExtrudeFeature: Feature = {
    id: 'extrude',
    label: 'Extrude',
    icon: ExtrudeIcon,
    description: 'Extrude a sketch into a 3D solid',
    shortcut: 'e',
    execute: (context) => {
        context.openPanel('extrude');
    }
};

export const generateExtrudeCode = (context: CodeGenerationContext, sketchName: string, distance: number, direction: 'default' | 'reversed' = 'default'): string => {
    const finalDistance = direction === 'reversed' ? -distance : distance;
    const resultName = context.generateUniqueName(`extruded_${sketchName.replace(/sketch/i, '').replace(/^_+/, '')}`);
    return `const ${resultName} = ${sketchName}.extrude(${finalDistance});`;
};
