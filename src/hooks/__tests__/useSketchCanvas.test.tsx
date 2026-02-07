/** @vitest-environment jsdom */
import { renderHook, act } from '@testing-library/react';
import { useSketchCanvas } from '../useSketchCanvas';
import { describe, it, expect } from 'vitest';
import { SketchingProvider } from '../../context/SketchingContext';
import React from 'react';

describe('useSketchCanvas', () => {
    // Mock canvas measurement
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

    it('should convert canvas coordinates to sketch coordinates correctly', () => {
        const { result } = setup();

        // Center (400, 300) -> (0, 0)
        expect(result.current.canvasToSketch(400, 300)).toEqual([0, 0]);

        // (410, 290) -> (1, 1) - 10px = 1 unit, Y is inverted
        expect(result.current.canvasToSketch(410, 290)).toEqual([1, 1]);

        // Snapping: (408, 292) -> (1, 1)
        expect(result.current.canvasToSketch(408, 292)).toEqual([1, 1]);
    });

    it('should convert sketch coordinates to canvas coordinates correctly', () => {
        const { result } = setup();

        // (0, 0) -> (400, 300)
        expect(result.current.sketchToCanvas([0, 0])).toEqual([400, 300]);

        // (10, 10) -> (500, 200) - 10 units = 100px, Y is inverted
        expect(result.current.sketchToCanvas([10, 10])).toEqual([500, 200]);
    });

    it('should manage drawing state through mouse events', () => {
        const { result } = setup();

        expect(result.current.isDrawing).toBe(false);

        // Start drawing
        act(() => {
            result.current.handleMouseDown(410, 290); // (1, 1)
        });
        expect(result.current.isDrawing).toBe(true);
        expect(result.current.startPoint).toEqual([1, 1]);

        // Move mouse
        act(() => {
            result.current.handleMouseMove(420, 280); // (2, 2)
        });
        expect(result.current.currentPoint).toEqual([2, 2]);

        // Finish drawing (Line tool by default)
        act(() => {
            result.current.handleMouseUp();
        });
        expect(result.current.isDrawing).toBe(false);
        expect(result.current.entities).toHaveLength(1);
        expect(result.current.entities[0]).toMatchObject({
            type: 'line',
            start: [1, 1],
            end: [2, 2]
        });
    });

    it('should create a rectangle entity correctly', () => {
        const { result } = setup();

        act(() => {
            result.current.setTool('rectangle');
        });
        act(() => {
            result.current.handleMouseDown(400, 300); // (0, 0)
        });
        act(() => {
            result.current.handleMouseMove(450, 250); // (5, 5)
        });
        act(() => {
            result.current.handleMouseUp();
        });

        expect(result.current.entities).toHaveLength(1);
        expect(result.current.entities[0]).toMatchObject({
            type: 'rectangle',
            corner: [0, 5],
            width: 5,
            height: 5
        });
    });

    it('should create a circle entity correctly', () => {
        const { result } = setup();

        act(() => {
            result.current.setTool('circle');
        });
        act(() => {
            result.current.handleMouseDown(400, 300); // (0, 0) center
        });
        act(() => {
            result.current.handleMouseMove(430, 300); // (3, 0) edge
        });
        act(() => {
            result.current.handleMouseUp();
        });

        expect(result.current.entities).toHaveLength(1);
        expect(result.current.entities[0]).toMatchObject({
            type: 'circle',
            center: [0, 0],
            radius: 3
        });
    });

    it('should snap line length when dynamic input is provided', () => {
        const { result } = setup();

        // Start drawing at (0, 0)
        act(() => {
            result.current.handleMouseDown(400, 300); // Center
        });

        // Set dynamic input to 50
        act(() => {
            result.current.setDynamicInput('50');
        });

        // Move mouse to some diagonal position
        act(() => {
            result.current.handleMouseMove(500, 400);
        });

        // Verify currentPoint is at distance 50 from start
        const start = result.current.startPoint!;
        const current = result.current.currentPoint!;
        const dx = current[0] - start[0];
        const dy = current[1] - start[1];
        const distance = Math.sqrt(dx * dx + dy * dy);

        expect(Math.abs(distance - 50)).toBeLessThan(0.001);
    });

    it('should snap rectangle width when input target is primary', () => {
        const { result } = setup();

        act(() => { result.current.setTool('rectangle'); });
        act(() => { result.current.handleMouseDown(400, 300); });
        act(() => { result.current.setDynamicInput('30'); });
        act(() => { result.current.handleMouseMove(500, 400); });

        const start = result.current.startPoint!;
        const current = result.current.currentPoint!;

        // Width should be exactly 30
        expect(Math.abs(current[0] - start[0])).toBe(30);
    });

    it('should snap rectangle height when input target is secondary', () => {
        const { result } = setup();

        act(() => { result.current.setTool('rectangle'); });
        act(() => { result.current.handleMouseDown(400, 300); });
        act(() => { result.current.setInputTarget('secondary'); }); // Only affects UI state in hook
        act(() => { result.current.setSecondaryInput('40'); });     // Correctly set secondary value
        act(() => { result.current.handleMouseMove(500, 400); });

        const start = result.current.startPoint!;
        const current = result.current.currentPoint!;

        // Height should be exactly 40
        expect(Math.abs(current[1] - start[1])).toBe(40);
    });

    it('should snap circle radius when dynamic input is provided', () => {
        const { result } = setup();

        act(() => { result.current.setTool('circle'); });
        act(() => { result.current.handleMouseDown(400, 300); });
        act(() => { result.current.setDynamicInput('25'); });
        act(() => { result.current.handleMouseMove(500, 400); });

        const start = result.current.startPoint!;
        const current = result.current.currentPoint!;
        const dx = current[0] - start[0];
        const dy = current[1] - start[1];
        const distance = Math.sqrt(dx * dx + dy * dy);

        expect(Math.abs(distance - 25)).toBeLessThan(0.001);
    });
});
