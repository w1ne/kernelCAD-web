import { featureRegistry } from './FeatureRegistry';
import { BoxFeature, CylinderFeature, FilletFeature, ChamferFeature, CutFeature, UnionFeature, IntersectFeature, ExtrudeFeature, RevolveFeature, OffsetPlaneFeature, MidplaneFeature, TangentPlaneFeature, SketchOnFaceFeature, ExtrudeFromFaceFeature } from './core/index';

export function initFeatures() {
    featureRegistry.register(BoxFeature);
    featureRegistry.register(CylinderFeature);
    featureRegistry.register(OffsetPlaneFeature);
    featureRegistry.register(MidplaneFeature);
    featureRegistry.register(TangentPlaneFeature);
    featureRegistry.register(ExtrudeFeature);
    featureRegistry.register(RevolveFeature);
    featureRegistry.register(FilletFeature);
    featureRegistry.register(ChamferFeature);
    featureRegistry.register(CutFeature);
    featureRegistry.register(UnionFeature);
    featureRegistry.register(IntersectFeature);
    featureRegistry.register(SketchOnFaceFeature);
    featureRegistry.register(ExtrudeFromFaceFeature);
}
