// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { ViewerDimension } from '../../../../shared/intent/viewerDimension';
import { initialOn, useDimensionsToggle } from './useDimensionsToggle';

describe('initialOn', () => {
    it('defaults off for auto-only', () => expect(initialOn([{ source: 'auto' } as ViewerDimension], '')).toBe(false));
    it('defaults on when a declared dimension exists', () => expect(initialOn([{ source: 'declared' } as ViewerDimension], '')).toBe(true));
    it('?dims=1 forces on', () => expect(initialOn([], '?dims=1')).toBe(true));
    it('defaults off with no dimensions yet', () => expect(initialOn(undefined, '')).toBe(false));
    it('?dims=0 does not force on', () => expect(initialOn([], '?dims=0')).toBe(false));
});

describe('useDimensionsToggle', () => {
    const declared = (id: string) => ({ id, source: 'declared' }) as ViewerDimension;

    it('follows the default until the user toggles, and keeps the choice across rebuilds of the same model', () => {
        const { result, rerender } = renderHook(({ dims, model }) => useDimensionsToggle(dims, '', model), {
            initialProps: { dims: undefined as ViewerDimension[] | undefined, model: 'project-a' },
        });
        expect(result.current.on).toBe(false);
        rerender({ dims: [declared('declared:0')], model: 'project-a' });
        expect(result.current.on).toBe(true);
        act(() => result.current.toggle());
        expect(result.current.on).toBe(false);
        // Rebuild: a new payload with the same declared dimensions.
        rerender({ dims: [declared('declared:0'), { id: 'auto:overall:model:0', source: 'auto' } as ViewerDimension], model: 'project-a' });
        expect(result.current.on).toBe(false);
    });

    it('resets the choice when the model changes, so declared dimensions show again', () => {
        const { result, rerender } = renderHook(({ dims, model }) => useDimensionsToggle(dims, '', model), {
            initialProps: { dims: [declared('declared:0')] as ViewerDimension[], model: 'project-a' },
        });
        act(() => result.current.toggle());
        expect(result.current.on).toBe(false);
        rerender({ dims: [declared('declared:0')], model: 'project-b' });
        expect(result.current.on).toBe(true);
    });

    it('resets the choice when the declared dimensions change', () => {
        const { result, rerender } = renderHook(({ dims }) => useDimensionsToggle(dims, '', 'm'), {
            initialProps: { dims: [declared('declared:0')] as ViewerDimension[] },
        });
        act(() => result.current.toggle());
        rerender({ dims: [declared('declared:0'), declared('declared:1')] });
        expect(result.current.on).toBe(true);
    });
});
