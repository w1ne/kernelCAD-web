import { LayoutTemplate, PenTool, Scissors } from 'lucide-react';
import { type Feature } from '../types';

export const FilletFeature: Feature = {
    id: 'fillet',
    label: 'Fillet',
    icon: LayoutTemplate,
    description: 'Round the edges of the selected shape',
    execute: (context) => {
        context.insertCode('.fillet(1)');
    }
};

export const ChamferFeature: Feature = {
    id: 'chamfer',
    label: 'Chamfer',
    icon: PenTool,
    description: 'Bevel the edges of the selected shape',
    execute: (context) => {
        context.insertCode('.chamfer(1)');
    }
};

export const CutFeature: Feature = {
    id: 'cut',
    label: 'Cut',
    icon: Scissors,
    description: 'Subtract one shape from another',
    execute: (context) => {
        context.insertCode('.cut(other)');
    }
};
