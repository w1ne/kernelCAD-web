import { Plane } from 'lucide-react';
import { type Feature } from '../types';

export const OffsetPlaneFeature: Feature = {
    id: 'offsetPlane',
    label: 'Offset Plane',
    icon: Plane,
    description: 'Create a construction plane offset from an existing plane',
    execute: (context) => {
        context.setActiveDialog('offsetPlane');
    }
};
