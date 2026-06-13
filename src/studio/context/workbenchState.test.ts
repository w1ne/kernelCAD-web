// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect } from 'vitest';
import { workbenchReducer, INITIAL_STATE, type WorkbenchAction } from './workbenchState';

describe('workbenchReducer', () => {
    it('should handle START_SKETCH from IDLE', () => {
        const action: WorkbenchAction = { type: 'START_SKETCH', planeId: 'XY' };
        const newState = workbenchReducer(INITIAL_STATE, action);

        expect(newState.mode).toEqual({
            type: 'SKETCHING',
            planeId: 'XY',
            sketchId: undefined
        });
    });

    it('should handle OPEN_DIALOG replacing SKETCHING (Strict Mode)', () => {
        const sketchingState = {
            mode: { type: 'SKETCHING' as const, planeId: 'XY' }
        };

        const action: WorkbenchAction = { type: 'OPEN_DIALOG', id: 'extrude' };
        const newState = workbenchReducer(sketchingState, action);

        expect(newState.mode).toEqual({
            type: 'DIALOG',
            id: 'extrude',
            params: undefined
        });
    });

    it('should handle EXIT_SKETCH', () => {
        const sketchingState = {
            mode: { type: 'SKETCHING' as const, planeId: 'XY' }
        };

        const action: WorkbenchAction = { type: 'EXIT_SKETCH' };
        const newState = workbenchReducer(sketchingState, action);

        expect(newState.mode).toEqual({ type: 'IDLE' });
    });

    it('should ignore EXIT_SKETCH if not sketching', () => {
        const dialogState = {
            mode: { type: 'DIALOG' as const, id: 'test' }
        };

        const action: WorkbenchAction = { type: 'EXIT_SKETCH' };
        const newState = workbenchReducer(dialogState, action);

        // Should remain in dialog
        expect(newState.mode).toEqual({ type: 'DIALOG', id: 'test' });
    });

    it('should GO_IDLE from anywhere', () => {
        const complexState = {
            mode: { type: 'FACE_SELECTION' as const, purpose: 'feature' as const }
        };

        const action: WorkbenchAction = { type: 'GO_IDLE' };
        const newState = workbenchReducer(complexState, action);

        expect(newState.mode).toEqual({ type: 'IDLE' });
    });
});
