// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useCallback, useState } from 'react';
import type { ViewerDimension } from '../../../../shared/intent/viewerDimension';

/** True when the URL forces dimensions on (`?dims=1`). */
export function dimsForced(search: string): boolean {
    return new URLSearchParams(search).get('dims') === '1';
}

/** Default state of the Dimensions toggle: on when the model declares at
 *  least one dimension or the URL asks for `?dims=1`, off otherwise. */
export function initialOn(dimensions: readonly ViewerDimension[] | undefined, search: string): boolean {
    if (dimsForced(search)) return true;
    return (dimensions ?? []).some((d) => d.source === 'declared');
}

/** Identity of the model the user's choice applies to: the host's model key
 *  (project / script) plus the ids of its declared dimensions. */
function choiceKey(dimensions: readonly ViewerDimension[] | undefined, modelKey: string): string {
    const declared = (dimensions ?? []).filter((d) => d.source === 'declared').map((d) => d.id);
    return `${modelKey}#${declared.join(',')}`;
}

/** Toggle state that follows `initialOn` (dimensions arrive after the first
 *  render) until the viewer presses the button. The choice holds across
 *  rebuilds of the same model and resets when the model changes (another
 *  project or script, or a different set of declared dimensions), so a model
 *  that declares dimensions always opens with them visible. */
export function useDimensionsToggle(
    dimensions: readonly ViewerDimension[] | undefined,
    search: string,
    modelKey = '',
): { on: boolean; toggle(): void } {
    const [choice, setChoice] = useState<{ key: string; on: boolean } | null>(null);
    const key = choiceKey(dimensions, modelKey);
    const on = choice !== null && choice.key === key ? choice.on : initialOn(dimensions, search);
    const toggle = useCallback(() => setChoice({ key, on: !on }), [key, on]);
    return { on, toggle };
}
