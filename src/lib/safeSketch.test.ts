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

    it('should delegate valid bezier to underlying sketcher', () => {
        const mockSketcher = {
            movePointerTo: vi.fn().mockReturnThis(),
            lineTo: vi.fn().mockReturnThis(),
            close: vi.fn().mockReturnThis(),
            done: vi.fn(),
            bezier: vi.fn().mockReturnThis(),
        } as any;

        const safe = new SafeSketcher(mockSketcher);
        safe.movePointerTo([0, 0]);
        safe.bezier([1, 1], [2, 1], [3, 0]);

        expect(mockSketcher.bezier).toHaveBeenCalledWith([1, 1], [2, 1], [3, 0]);
    });

    it('should throw on invalid bezier input', () => {
        const mockSketcher = {
            movePointerTo: vi.fn().mockReturnThis(),
            lineTo: vi.fn().mockReturnThis(),
            close: vi.fn().mockReturnThis(),
            done: vi.fn(),
            bezier: vi.fn().mockReturnThis(),
        } as any;

        const safe = new SafeSketcher(mockSketcher);
        expect(() => safe.bezier([1, 1], [NaN, 1], [3, 0])).toThrow('Invalid bezier input');
        expect(mockSketcher.bezier).not.toHaveBeenCalled();
    });

    it('should delegate valid spline to underlying sketcher', () => {
        const mockSketcher = {
            movePointerTo: vi.fn().mockReturnThis(),
            lineTo: vi.fn().mockReturnThis(),
            close: vi.fn().mockReturnThis(),
            done: vi.fn(),
            spline: vi.fn().mockReturnThis(),
        } as any;

        const safe = new SafeSketcher(mockSketcher);
        safe.movePointerTo([0, 0]);
        safe.spline([[1, 1], [2, 1], [3, 0]]);

        expect(mockSketcher.spline).toHaveBeenCalledWith([[1, 1], [2, 1], [3, 0]]);
    });

    it('should throw on invalid spline input', () => {
        const mockSketcher = {
            movePointerTo: vi.fn().mockReturnThis(),
            lineTo: vi.fn().mockReturnThis(),
            close: vi.fn().mockReturnThis(),
            done: vi.fn(),
            spline: vi.fn().mockReturnThis(),
        } as any;

        const safe = new SafeSketcher(mockSketcher);
        expect(() => safe.spline([[1, 1]])).toThrow('Invalid spline input');
        expect(() => safe.spline([[1, 1], [Infinity, 2]] as any)).toThrow('Invalid spline input');
        expect(mockSketcher.spline).not.toHaveBeenCalled();
    });

    it('should call onShapeCreated upon extrude', () => {
        const mockExtrudeResult = { type: 'shape' };
        const mockDoneResult = {
            extrude: vi.fn().mockReturnValue(mockExtrudeResult)
        };
        const mockSketcher = {
            done: vi.fn().mockReturnValue(mockDoneResult),
            hasGeometry: true
        } as any;

        const onShapeCreated = vi.fn();
        const safe = new SafeSketcher(mockSketcher, onShapeCreated);
        (safe as any).hasGeometry = true; // manually set for test

        const result = safe.extrude(10);

        expect(result).toBe(mockExtrudeResult);
        expect(onShapeCreated).toHaveBeenCalledWith(mockExtrudeResult);
    });

    it('should wrap primitive creators in createSafeReplicad', () => {
        const mockBox = { type: 'box' };
        const mockCylinder = { type: 'cylinder' };
        const mockReplicad = {
            Sketcher: class { constructor() { } },
            makeBox: vi.fn().mockReturnValue(mockBox),
            makeBaseBox: vi.fn().mockReturnValue(mockBox),
            makeCylinder: vi.fn().mockReturnValue(mockCylinder),
        };

        const onShapeCreated = vi.fn();
        const safeReplicad = createSafeReplicad(mockReplicad as any, undefined, onShapeCreated);

        const box = (safeReplicad as any).makeBox(10, 10, 10);
        expect(box).toBe(mockBox);
        expect(onShapeCreated).toHaveBeenCalledWith(mockBox);

        const cylinder = (safeReplicad as any).makeCylinder(5, 10);
        expect(cylinder).toBe(mockCylinder);
        expect(onShapeCreated).toHaveBeenCalledWith(mockCylinder);
    });
});
