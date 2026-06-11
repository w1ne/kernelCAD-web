// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect, vi } from 'vitest';
import { SafeSketcher, createSafeReplicad } from './safeSketch';

describe('SafeSketcher', () => {
    it('should create safe replicad factory', () => {
        const mockReplicad = {
            Sketcher: class {
                constructor(_plane: any) { }
                lineTo() { return this; }
            }
        };
        const safeReplicad = createSafeReplicad(mockReplicad);
        const sketcher = new safeReplicad.Sketcher("plane");
        expect(sketcher).toBeInstanceOf(SafeSketcher);
    });


    it('should delegate basic commands to the underlying sketcher', () => {
        const mockSketcher = {
            movePointerTo: vi.fn().mockReturnThis(),
            lineTo: vi.fn().mockReturnThis(),
            close: vi.fn().mockReturnThis(),
            extrude: vi.fn(),
        } as any;

        const safe = new SafeSketcher(mockSketcher);
        safe.movePointerTo([0, 0]);
        safe.lineTo([10, 0]);
        safe.close();

        // SafeSketcher might replay immediately or on build. 
        // Let's assume it buffers and we need to call something or it delegates immediately.
        // For the "Logic Layer", checking immediate delegation is fine if we implement it that way.
        // But we want "smart" filtering, so buffering is likely.

        // Let's assume we call a method to finalize or it just proxies.
        // If it proxies smart, it should have called them.
        expect(mockSketcher.movePointerTo).toHaveBeenCalledWith([0, 0]);
        expect(mockSketcher.lineTo).toHaveBeenCalledWith([10, 0]);
        expect(mockSketcher.close).toHaveBeenCalled();
    });

    it('should ignore redundant movePointerTo commands', () => {
        const mockSketcher = {
            movePointerTo: vi.fn().mockReturnThis(),
            lineTo: vi.fn().mockReturnThis(),
            close: vi.fn().mockReturnThis(),
        } as any;

        // Mock getting current position if needed, or SafeSketcher tracks it.
        // Replicad Sketcher doesn't easily expose current pointer without computation?
        // SafeSketcher MUST track it.

        const safe = new SafeSketcher(mockSketcher);

        safe.movePointerTo([0, 0]);
        safe.lineTo([10, 0]);

        // Redundant move to the same point
        safe.movePointerTo([10, 0]);

        safe.lineTo([10, 10]);

        // Expectation: The second movePointerTo should NOT be called on the underlying sketcher
        expect(mockSketcher.movePointerTo).toHaveBeenCalledTimes(1);
        expect(mockSketcher.lineTo).toHaveBeenCalledTimes(2);
    });

    it('should handle fuzzy coordinates in redundancy check', () => {
        const mockSketcher = {
            movePointerTo: vi.fn().mockReturnThis(),
            lineTo: vi.fn().mockReturnThis(),
            close: vi.fn().mockReturnThis(),
        } as any;

        const safe = new SafeSketcher(mockSketcher);
        safe.movePointerTo([0, 0]);
        safe.lineTo([10, 0]);

        // Slightly off but within standard tolerance (e.g. 1e-6)
        safe.movePointerTo([10.0000001, 0]);

        safe.lineTo([10, 10]);

        expect(mockSketcher.movePointerTo).toHaveBeenCalledTimes(1);
    });

    it('should auto-close method if moving pointer while loop is open', () => {
        const mockSketcher = {
            movePointerTo: vi.fn().mockReturnThis(),
            lineTo: vi.fn().mockReturnThis(),
            close: vi.fn().mockReturnThis(),
        } as any;

        const safe = new SafeSketcher(mockSketcher);

        // Start loop 1
        safe.movePointerTo([0, 0]);
        safe.lineTo([10, 0]);

        // Start loop 2 (without closing loop 1 explicitly)
        // SafeSketcher should detect logic error and auto-close loop 1
        safe.movePointerTo([20, 0]);

        expect(mockSketcher.close).toHaveBeenCalledTimes(1);
        expect(mockSketcher.movePointerTo).toHaveBeenCalledTimes(2); // Initial [0,0] and [20,0]
    });
});
