// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect } from 'vitest';
import {
    isExecuteRequest,
    isExportRequest,
    isSuccessResponse,
    isErrorResponse,
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
});
