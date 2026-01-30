import { describe, it, expect, vi } from 'vitest';
import { OffsetPlaneFeature } from './plane.feature';
import { type FeatureContext } from '../types';

describe('OffsetPlaneFeature', () => {
    it('should trigger the offsetPlane dialog on execution', () => {
        const mockContext: FeatureContext = {
            insertCode: vi.fn(),
            setActiveDialog: vi.fn(),
            code: '',
        };

        OffsetPlaneFeature.execute(mockContext);

        expect(mockContext.setActiveDialog).toHaveBeenCalledWith('offsetPlane');
    });
});
