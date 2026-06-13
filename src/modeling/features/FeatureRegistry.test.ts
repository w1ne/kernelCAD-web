// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { featureRegistry } from './FeatureRegistry';
import { type Feature } from './types';
import { Box } from 'lucide-react';

const mockFeature: Feature = {
    id: 'test-feat',
    label: 'Test',
    icon: Box,
    execute: vi.fn()
};

describe('FeatureRegistry', () => {
    beforeEach(() => {
        featureRegistry.clear();
    });

    // Registry is a singleton, so state persists. 
    // We should ideally clear it, but the class doesn't expose clear().
    // We can rely on unique IDs or just checking existence.

    it('should register and retrieve a feature', () => {
        featureRegistry.register(mockFeature);
        const retrieved = featureRegistry.get('test-feat');
        expect(retrieved).toBe(mockFeature);
    });

    it('should return all registered features', () => {
        featureRegistry.register(mockFeature);
        const all = featureRegistry.getAll();
        expect(all).toContain(mockFeature);
    });

    it('should allow overwrite in test runtime', () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
        const next = { ...mockFeature, label: 'Test 2' };
        featureRegistry.register(mockFeature);
        featureRegistry.register(next);

        expect(featureRegistry.get('test-feat')?.label).toBe('Test 2');
        expect(warnSpy).toHaveBeenCalled();
        warnSpy.mockRestore();
    });
});
