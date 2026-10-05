// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useFrame } from '@react-three/fiber';
import { useState } from 'react';
import type { V3 } from '../../../../shared/intent/viewerDimension';
import type { ViewOctant } from './placement';

const side = (v: number): number => (v >= 0 ? 1 : -1);
const INITIAL: ViewOctant = [1, 1, 1];

/** Side of `centre` the camera is on, per axis. Changes (and re-renders)
 *  only when the camera crosses one of the three centre planes; a frame
 *  that stays in the octant allocates nothing. */
export function useViewOctant(centre: V3): ViewOctant {
    const [eye, setEye] = useState<ViewOctant>(INITIAL);
    useFrame(({ camera }) => {
        const p = camera.position;
        const x = side(p.x - centre[0]);
        const y = side(p.y - centre[1]);
        const z = side(p.z - centre[2]);
        if (x !== eye[0] || y !== eye[1] || z !== eye[2]) setEye([x, y, z]);
    });
    return eye;
}
