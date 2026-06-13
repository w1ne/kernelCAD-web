// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { PlaneIcon } from '../../../shared/icons/CustomIcons';
import { type Feature } from '../types';

export const OffsetPlaneFeature: Feature = {
    id: 'offsetPlane',
    label: 'Construction Plane',
    icon: PlaneIcon,
    description: 'Create a reference plane from a face or existing plane',
    shortcut: 'p',
    execute: (context) => {
        context.openPanel('offsetPlane');
    }
};

export const MidplaneFeature: Feature = {
    id: 'midplane',
    label: 'Midplane',
    icon: PlaneIcon, // Will update to more specific icon if needed later
    description: 'Create a plane exactly between two selected faces',
    execute: (context) => {
        context.openPanel('midplane');
    }
};

export const TangentPlaneFeature: Feature = {
    id: 'tangentPlane',
    label: 'Tangent Plane',
    icon: PlaneIcon,
    description: 'Create a plane tangent to a cylindrical or conical face',
    execute: (context) => {
        context.openPanel('tangentPlane');
    }
};
