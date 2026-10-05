// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useCallback, useState } from 'react';
import type { ViewerDimension } from '../../../../shared/intent/viewerDimension';

/** Default state of the Dimensions toggle: on when the model declares at
 *  least one dimension or the URL asks for `?dims=1`, off otherwise. */
export function initialOn(dimensions: readonly ViewerDimension[] | undefined, search: string): boolean {
    if (new URLSearchParams(search).get('dims') === '1') return true;
    return (dimensions ?? []).some((d) => d.source === 'declared');
}

/** Toggle state that follows `initialOn` (dimensions arrive after the first
 *  render) until the viewer presses the button; from then on their choice wins. */
export function useDimensionsToggle(
    dimensions: readonly ViewerDimension[] | undefined,
    search: string,
): { on: boolean; toggle(): void } {
    const [choice, setChoice] = useState<boolean | null>(null);
    const on = choice ?? initialOn(dimensions, search);
    const toggle = useCallback(() => setChoice(!on), [on]);
    return { on, toggle };
}
