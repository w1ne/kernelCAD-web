// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fillet, chamfer, extrude } from './geometryHelpers';

const replicadMock = vi.hoisted(() => ({
    drawFaceOutline: vi.fn(),
    makePlaneFromFace: vi.fn(),
}));

vi.mock('replicad', () => ({
    Sketcher: class {},
    makePlaneFromFace: replicadMock.makePlaneFromFace,
    drawFaceOutline: replicadMock.drawFaceOutline,
}));

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

describe('extrude (characterisation)', () => {
    beforeEach(() => {
        replicadMock.drawFaceOutline.mockReset();
        replicadMock.makePlaneFromFace.mockReset();
    });

    it('prefers the native extrude method', () => {
        const shape = { extrude: vi.fn((distance: number) => ({ distance })) };
        expect(extrude(shape, 4)).toEqual({ distance: 4 });
        expect(shape.extrude).toHaveBeenCalledWith(4);
    });

    it('rejects a non-record profile', () => {
        expect(() => extrude(null, 1)).toThrow('Cannot extrude: invalid profile');
        expect(() => extrude(42, 1)).toThrow('Cannot extrude: invalid profile');
    });

    it('reports the geom type for a non-planar object without a plane', () => {
        expect(() => extrude({ geomType: 'CYLINDER' }, 1)).toThrow(
            'Cannot extrude non-planar object (type: CYLINDER). Please select a flat face.',
        );
        expect(() => extrude({}, 1)).toThrow(
            'Cannot extrude non-planar object (type: unknown). Please select a flat face.',
        );
    });

    it('extrudes a planar face through replicad.drawFaceOutline', () => {
        const sketchExtrude = vi.fn(() => ({ extruded: true }));
        const sketchOnPlane = vi.fn(() => ({ extrude: sketchExtrude }));
        replicadMock.drawFaceOutline.mockReturnValue({ sketchOnPlane });
        const profile = { geomType: 'PLANE', planarPlane: { kind: 'plane' } };
        expect(extrude(profile, 3)).toEqual({ extruded: true });
        expect(replicadMock.drawFaceOutline).toHaveBeenCalledWith(profile);
        expect(sketchOnPlane).toHaveBeenCalledWith({ kind: 'plane' });
        expect(sketchExtrude).toHaveBeenCalledWith(3);
    });

    it('derives a plane from a planar face when none is stored', () => {
        replicadMock.makePlaneFromFace.mockReturnValue({ derived: true });
        const sketchExtrude = vi.fn(() => 'extruded');
        replicadMock.drawFaceOutline.mockReturnValue({
            sketchOnPlane: () => ({ extrude: sketchExtrude }),
        });
        const profile = { geomType: 'Planar' };
        expect(extrude(profile, 2)).toBe('extruded');
        expect(replicadMock.makePlaneFromFace).toHaveBeenCalledWith(profile);
        expect(sketchExtrude).toHaveBeenCalledWith(2);
    });

    it('maps a known native extrude failure to the friendly message', () => {
        const shape = {
            extrude: vi.fn(() => {
                throw new Error('No lines to convert into a wire');
            }),
        };
        expect(() => extrude(shape, 1)).toThrow(
            'Extrusion failed: The sketch is empty or contains invalid geometry. Please draw some geometry before extruding.',
        );
    });

    it('rethrows an unrecognised native extrude failure unchanged', () => {
        const shape = {
            extrude: vi.fn(() => {
                throw new Error('boom');
            }),
        };
        expect(() => extrude(shape, 1)).toThrow('boom');
    });
});
