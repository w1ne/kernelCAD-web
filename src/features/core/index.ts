import { Box, Cylinder, LayoutTemplate, PenTool, Scissors } from 'lucide-react';
import { type Feature } from '../types';

export const BoxFeature: Feature = {
    id: 'box',
    label: 'Box',
    icon: Box,
    parameters: [
        { name: 'width', label: 'Width', type: 'number', defaultValue: 20 },
        { name: 'depth', label: 'Depth', type: 'number', defaultValue: 20 },
        { name: 'height', label: 'Height', type: 'number', defaultValue: 20 },
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

export const CylinderFeature: Feature = {
    id: 'cylinder',
    label: 'Cylinder',
    icon: Cylinder,
    parameters: [
        { name: 'radius', label: 'Radius', type: 'number', defaultValue: 10 },
        { name: 'height', label: 'Height', type: 'number', defaultValue: 20 },
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

export const FilletFeature: Feature = {
    id: 'fillet',
    label: 'Fillet',
    icon: LayoutTemplate,
    execute: (context) => {
        context.insertCode('.fillet(1)');
    }
};

export const ChamferFeature: Feature = {
    id: 'chamfer',
    label: 'Chamfer',
    icon: PenTool,
    execute: (context) => {
        context.insertCode('.chamfer(1)');
    }
};

export const CutFeature: Feature = {
    id: 'cut',
    label: 'Cut',
    icon: Scissors,
    execute: (context) => {
        context.insertCode('.cut(other)');
    }
};
