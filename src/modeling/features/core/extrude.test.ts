import { describe, it, expect, vi } from 'vitest';
import { ExtrudeFeature } from './extrude.feature';
import { type FeatureContext } from '../types';

describe('ExtrudeFeature', () => {
    it('should trigger the extrude panel on execution', () => {
        const mockContext: FeatureContext = {
            insertCode: vi.fn(),
            openPanel: vi.fn(),
            closePanel: vi.fn(),
            code: '',
        } as unknown as FeatureContext;

        ExtrudeFeature.execute(mockContext);

        expect(mockContext.openPanel).toHaveBeenCalledWith('extrude');
    });
});
