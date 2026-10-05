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
    it('follows the default until the user toggles', () => {
        const { result, rerender } = renderHook(({ dims }) => useDimensionsToggle(dims, ''), {
            initialProps: { dims: undefined as ViewerDimension[] | undefined },
        });
        expect(result.current.on).toBe(false);
        rerender({ dims: [{ source: 'declared' } as ViewerDimension] });
        expect(result.current.on).toBe(true);
        act(() => result.current.toggle());
        expect(result.current.on).toBe(false);
        rerender({ dims: [{ source: 'declared' } as ViewerDimension, { source: 'declared' } as ViewerDimension] });
        expect(result.current.on).toBe(false);
    });
});
