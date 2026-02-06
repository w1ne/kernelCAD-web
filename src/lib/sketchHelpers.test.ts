import { describe, it, expect } from 'vitest';
import { computeCentroid } from './sketchHelpers';

describe('sketchHelpers', () => {
    describe('computeCentroid', () => {
        it('should return null for empty points', () => {
            expect(computeCentroid([])).toBeNull();
        });

        it('should return the point itself for a single point', () => {
            const points = [{ id: '1', x: 10, y: 20 }];
            expect(computeCentroid(points)).toEqual({ x: 10, y: 20 });
        });

        it('should calculate the average position for multiple points', () => {
            const points = [
                { id: '1', x: 0, y: 0 },
                { id: '2', x: 10, y: 10 },
                { id: '3', x: 20, y: 20 }
            ];
            // Average: (0+10+20)/3 = 10
            expect(computeCentroid(points)).toEqual({ x: 10, y: 10 });
        });

        it('should handle negative coordinates', () => {
            const points = [
                { id: '1', x: -10, y: -10 },
                { id: '2', x: 10, y: 10 }
            ];
            expect(computeCentroid(points)).toEqual({ x: 0, y: 0 });
        });
    });
});
