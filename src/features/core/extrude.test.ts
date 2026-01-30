import { describe, it, expect, vi } from 'vitest';
import { ExtrudeFeature } from './extrude.feature';
import { type FeatureContext } from '../types';

describe('ExtrudeFeature', () => {
    it('should trigger the extrude dialog on execution', () => {
        const mockContext: FeatureContext = {
            insertCode: vi.fn(),
            setActiveDialog: vi.fn(),
            code: '',
        };

        ExtrudeFeature.execute(mockContext);

        expect(mockContext.setActiveDialog).toHaveBeenCalledWith('extrude');
    });
});
