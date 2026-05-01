// src/backends/occt/queryKeys.ts
//
// Single source of truth for the legal keys of `EdgeQuery` and `FaceQuery`.
// All consumers (capture-side dispatch, lowerer-side validation, MCP
// `list_api`) import from here so a future addition to `EdgeQuery` /
// `FaceQuery` only requires updating these arrays once.
//
// The arrays are typed `ReadonlyArray<keyof EdgeQuery>` (etc) so a key not
// in the type fails at compile time. The drift guard is a runtime test
// that checks length matches.
import type { EdgeQuery, FaceQuery } from './edgeQueries';

export const EDGE_QUERY_KEYS: ReadonlyArray<keyof EdgeQuery> = [
  'atZ', 'atX', 'atY', 'near', 'within', 'parallel', 'perpendicular',
  'convex', 'concave', 'minAngle', 'maxAngle', 'ofCurveType',
  'tolerance', 'angleTolerance',
];

export const FACE_QUERY_KEYS: ReadonlyArray<keyof FaceQuery> = [
  'atZ', 'atX', 'atY', 'parallelTo', 'inPlane', 'ofSurfaceType',
  'containsPoint', 'near', 'tolerance',
];
