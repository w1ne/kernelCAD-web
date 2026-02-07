/** @vitest-environment jsdom */
import { renderHook, act } from '@testing-library/react';
import { useSketchCanvas } from '../useSketchCanvas';
import { describe, it, expect } from 'vitest';
import { SketchingProvider } from '../../context/SketchingContext';
import React from 'react';

describe('useSketchCanvas Snapping', () => {
    const setup = () => {
        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <SketchingProvider>
                {children}
            </SketchingProvider>
        );

        return renderHook(() => useSketchCanvas({
            canvasWidth: 800,
            canvasHeight: 600,
            gridSize: 10,
            gridUnit: 1
        }), { wrapper });
    };

    it('should snap to horizontal line', () => {
        const { result } = setup();

        // Start at (0, 0)
        act(() => {
            result.current.handleMouseDown(400, 300);
        });

        // Move to (10, 0.1) - close to horizontal
        act(() => {
            // 400 + 100 = 500 (x=10)
            // 300 - 1 = 299 (y=0.1)
            result.current.handleMouseMove(500, 299);
        });

        // Should snap to (10, 0)
        expect(result.current.currentPoint).toEqual([10, 0]);
        expect(result.current.snapState?.type).toBe('horizontal');
    });

    it('should snap to vertical line', () => {
        const { result } = setup();

        // Start at (0, 0)
        act(() => {
            result.current.handleMouseDown(400, 300);
        });

        // Move to (0.1, 10) - close to vertical
        act(() => {
            // 400 + 1 = 401 (x=0.1)
            // 300 - 100 = 200 (y=10)
            result.current.handleMouseMove(401, 200);
        });

        // Should snap to (0, 10)
        expect(result.current.currentPoint).toEqual([0, 10]);
        expect(result.current.snapState?.type).toBe('vertical');
    });

    it('should snap coincident to start point', () => {
        const { result } = setup();

        // 1. Draw a line from (0,0) to (10,0)
        act(() => {
            result.current.handleMouseDown(400, 300);
        });
        act(() => {
            result.current.handleMouseMove(500, 300);
        });
        act(() => {
            result.current.handleMouseUp();
        });

        // 2. Start new line at (10, 10)
        act(() => {
            result.current.handleMouseDown(500, 200);
        });

        // 3. Move back close to (0,0) -> (0.1, 0.1)
        act(() => {
            result.current.handleMouseMove(401, 299);
        });

        // Should snap to (0,0)
        expect(result.current.currentPoint).toEqual([0, 0]);
        expect(result.current.snapState?.type).toBe('coincident');
    });

    it('should prioritize coincident over horizontal/vertical', () => {
        const { result } = setup();

        // 1. Create a point at (10, 0) via a previous line
        act(() => {
            result.current.handleMouseDown(400, 300); // 0,0
        });
        act(() => {
            result.current.handleMouseMove(500, 300); // 10,0
        });
        act(() => {
            result.current.handleMouseUp();
        });

        // 2. Start new line at (0, 1) - aligned vertically with start, but we target (10,0)
        act(() => {
            result.current.handleMouseDown(400, 290); // 0,1
        });

        // 3. Move to (10.1, 0.1) - close to (10,0)
        // Also somewhat horizontal from (0,1)? No, (0,1) -> (10,0) is diagonal.
        // Let's test a case where H/V conflicts with Coincident.
        // Start at (0,0). Existing point at (10, 0.2).
        // If we move to (10, 0), it is perfectly Horizontal.
        // If we move to (10, 0.2), it is Coincident.
        // Coincident should win.

        // Let's try: Existing point at (5, 0.2).
        // Start at (0,0). Move to (5, 0).
        // Horizontal snap gives (5, 0).
        // Coincident snap gives (5, 0.2).
        // If dist((5,0), (5,0.2)) is small, Coincident should win.
    });
});
