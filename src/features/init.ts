import { featureRegistry } from './FeatureRegistry';
import { BoxFeature, CylinderFeature, FilletFeature, ChamferFeature, CutFeature } from './core';

export function initFeatures() {
    featureRegistry.register(BoxFeature);
    featureRegistry.register(CylinderFeature);
    featureRegistry.register(FilletFeature);
    featureRegistry.register(ChamferFeature);
    featureRegistry.register(CutFeature);
}
