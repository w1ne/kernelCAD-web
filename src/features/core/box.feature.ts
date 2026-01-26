import { Box } from 'lucide-react';
import { type Feature } from '../types';

export const BoxFeature: Feature = {
    id: 'box',
    label: 'Box',
    icon: Box,
    description: 'Create a rectangular box primitive',
    parameters: [
        { name: 'width', label: 'Width', type: 'number', defaultValue: 20, min: 0.1, step: 0.1 },
        { name: 'depth', label: 'Depth', type: 'number', defaultValue: 20, min: 0.1, step: 0.1 },
        { name: 'height', label: 'Height', type: 'number', defaultValue: 20, min: 0.1, step: 0.1 },
    ],
    execute: (context, args) => {
        if (!args) return;
        const { width, depth, height } = args;
        context.insertCode(
            (name) => `const ${name} = replicad.makeBox(${width}, ${depth}, ${height});`,
            'box'
        );
    }
};
