// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect, vi } from 'vitest';
import { OffsetPlaneFeature } from './plane.feature';
import { type FeatureContext } from '../types';

describe('OffsetPlaneFeature', () => {
    it('should trigger the offsetPlane panel on execution', () => {
        const mockContext: FeatureContext = {
            insertCode: vi.fn(),
            openPanel: vi.fn(),
            closePanel: vi.fn(),
            code: '',
        } as unknown as FeatureContext;

        OffsetPlaneFeature.execute(mockContext);

        expect(mockContext.openPanel).toHaveBeenCalledWith('offsetPlane');
    });
});
