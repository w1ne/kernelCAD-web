// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect, vi } from 'vitest';
import { fillet, chamfer } from './geometryHelpers';

describe('Geometry Helpers', () => {
    it('fillet should call shape.fillet', () => {
        const mockShape = {
            fillet: vi.fn(),
        };
        fillet(mockShape, 1);
        expect(mockShape.fillet).toHaveBeenCalledWith(1, undefined);
    });

    it('chamfer should call shape.chamfer', () => {
        const mockShape = {
            chamfer: vi.fn(),
        };
        chamfer(mockShape, 1);
        expect(mockShape.chamfer).toHaveBeenCalledWith(1, undefined);
    });

    it('should throw if fillet not supported', () => {
        const mockShape = {};
        expect(() => fillet(mockShape, 1)).toThrow("Shape does not support fillet");
    });
});
