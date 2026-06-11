// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { Cylinder } from 'lucide-react';
import { type Feature } from '../types';

export const CylinderFeature: Feature<Record<string, number>> = {
    id: 'cylinder',
    label: 'Cylinder',
    icon: Cylinder,
    description: 'Create a cylindrical primitive',
    parameters: [
        { name: 'radius', label: 'Radius', type: 'number', defaultValue: 10, min: 0.1, step: 0.1 },
        { name: 'height', label: 'Height', type: 'number', defaultValue: 20, min: 0.1, step: 0.1 },
    ],
    execute: (context, args) => {
        if (!args) return;
        const { radius, height } = args;
        context.insertCode(
            (name) => `const ${name} = replicad.makeCylinder(${radius}, ${height});`,
            'cyl'
        );
    }
};
