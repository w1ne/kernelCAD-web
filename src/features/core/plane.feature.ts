import { PlaneIcon } from '../../components/CustomIcons';
import { type Feature } from '../types';

export const OffsetPlaneFeature: Feature = {
    id: 'offsetPlane',
    label: 'Construction Plane',
    icon: PlaneIcon,
    description: 'Create a reference plane from a face or existing plane',
    execute: (context) => {
        context.setActiveDialog('offsetPlane');
    }
};
