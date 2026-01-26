import { ArrowUpToLine } from 'lucide-react';
import { type Feature } from '../types';

export const ExtrudeFeature: Feature = {
    id: 'extrude',
    label: 'Extrude',
    icon: ArrowUpToLine,
    description: 'Extrude a sketch into a 3D solid',
    execute: (context) => {
        context.setActiveDialog('extrude');
    }
};
