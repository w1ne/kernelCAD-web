// src/agent/vision/index.ts
//
// Public surface of the `src/agent/vision/` module — photo-to-sketch trace.
// Stub for Task 1; full `traceFromImage()` orchestrator lands in Task 4.

export type {
  Vec2Normalized,
  TraceBackend,
  TraceFeatureKind,
  TraceFeatureRequest,
  TraceFeatureResult,
  TraceFromImageInput,
  TraceFromImageOutput,
  TraceDiagnostic,
} from './types';
export { DEFAULT_MAX_WAYPOINTS_PER_FEATURE } from './types';

export {
  AnthropicVisionClient,
  defaultVisionClient,
} from './anthropicVisionClient';
export type {
  AnthropicSdkLike,
  AnthropicVisionClientOptions,
  DefaultVisionClientOptions,
  VisionMediaType,
  VisionRequest,
  VisionResponse,
} from './anthropicVisionClient';
