// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useFrame } from '@react-three/fiber';
import { useMemo, useState } from 'react';
import type { V3 } from '../../../../shared/intent/viewerDimension';
import type { ViewOctant } from './placement';

const side = (v: number): number => (v >= 0 ? 1 : -1);

/** Side of `centre` the camera is on, per axis. Changes (and re-renders)
 *  only when the camera crosses one of the three centre planes. */
export function useViewOctant(centre: V3): ViewOctant {
    const [key, setKey] = useState('1,1,1');
    useFrame(({ camera }) => {
        const p = camera.position;
        const next = `${side(p.x - centre[0])},${side(p.y - centre[1])},${side(p.z - centre[2])}`;
        if (next !== key) setKey(next);
    });
    return useMemo(() => key.split(',').map(Number) as unknown as ViewOctant, [key]);
}
