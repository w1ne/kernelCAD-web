// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect } from 'vitest';
import {
    ExecuteRequestSchema,
    isExecuteRequest,
    isExecutePreviewResponse,
    isExportRequest,
    isSuccessResponse,
    isErrorResponse,
    WorkerResponseSchema,
    type WorkerRequest,
    type WorkerResponse
} from './workerTypes';

describe('Worker Type Guards', () => {
    describe('isExecuteRequest', () => {
        it('should return true for EXECUTE type', () => {
            const req: WorkerRequest = { type: 'EXECUTE', id: '1', code: 'foo' };
            expect(isExecuteRequest(req)).toBe(true);
        });

        it('should return false for other types', () => {
            const req: WorkerRequest = { type: 'EXPORT_STEP', id: '1', code: 'foo' };
            expect(isExecuteRequest(req)).toBe(false);
        });
    });

    describe('isExportRequest', () => {
        it('should return true for EXPORT_STEP type', () => {
            const req: WorkerRequest = { type: 'EXPORT_STEP', id: '1', code: 'foo' };
            expect(isExportRequest(req)).toBe(true);
        });

        it('should return true for EXPORT_STL type', () => {
            const req: WorkerRequest = { type: 'EXPORT_STL', id: '1', code: 'foo' };
            expect(isExportRequest(req)).toBe(true);
        });

        it('should return false for EXECUTE type', () => {
            const req: WorkerRequest = { type: 'EXECUTE', id: '1', code: 'foo' };
            expect(isExportRequest(req)).toBe(false);
        });
    });

    describe('isSuccessResponse', () => {
        it('should return true for SUCCESS type', () => {
            const res: WorkerResponse = { type: 'SUCCESS', id: '1' };
            expect(isSuccessResponse(res)).toBe(true);
        });

        it('should return false for ERROR type', () => {
            const res: WorkerResponse = { type: 'ERROR', id: '1', error: 'fail' };
            expect(isSuccessResponse(res)).toBe(false);
        });
    });

    describe('isErrorResponse', () => {
        it('should return true for ERROR type', () => {
            const res: WorkerResponse = { type: 'ERROR', id: '1', error: 'fail' };
            expect(isErrorResponse(res)).toBe(true);
        });

        it('should return false for SUCCESS type', () => {
            const res: WorkerResponse = { type: 'SUCCESS', id: '1' };
            expect(isErrorResponse(res)).toBe(false);
        });
    });

    describe('ExecuteRequest meshQuality', () => {
        it('omits the tier for a display pass', () => {
            const req = ExecuteRequestSchema.parse({ type: 'EXECUTE', id: '1', code: 'x' });
            expect(req.meshQuality).toBeUndefined();
        });

        it('accepts the coarse preview tier', () => {
            const req = ExecuteRequestSchema.parse({ type: 'EXECUTE', id: '1', code: 'x', meshQuality: 'coarse' });
            expect(req.meshQuality).toBe('coarse');
        });

        it('rejects an unknown tier', () => {
            expect(() => ExecuteRequestSchema.parse({ type: 'EXECUTE', id: '1', code: 'x', meshQuality: 'draft' })).toThrow();
        });
    });

    describe('isExecutePreviewResponse', () => {
        it('should return true only for EXECUTE_PREVIEW', () => {
            const preview: WorkerResponse = {
                type: 'EXECUTE_PREVIEW',
                id: '1',
                geometries: { geometries: [], sketches: [] },
            };
            expect(isExecutePreviewResponse(preview)).toBe(true);
            expect(isExecutePreviewResponse({ type: 'SUCCESS', id: '1' })).toBe(false);
            expect(isSuccessResponse(preview)).toBe(false);
        });
    });

    it('preserves BREP edge picking metadata across the worker response boundary', () => {
        const response = WorkerResponseSchema.parse({
            type: 'SUCCESS',
            id: 'edge-metadata',
            geometries: {
                geometries: [{
                    faces: [],
                    edges: new Float32Array([0, 0, 0, 1, 0, 0]),
                    edgeRanges: [0, 2],
                    edgeOwners: ['feature-root'],
                    edgeStableIds: ['s0123456789abcdef'],
                }],
                sketches: [],
            },
        });

        expect(response).toMatchObject({
            geometries: {
                geometries: [{
                    edgeRanges: [0, 2],
                    edgeOwners: ['feature-root'],
                    edgeStableIds: ['s0123456789abcdef'],
                }],
            },
        });
    });
});
