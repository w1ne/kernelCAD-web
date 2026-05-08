// src/intent/queryKeys.ts
//
// Single source of truth for the legal keys of `EdgeQuery` and `FaceQuery`.
// All consumers (capture-side dispatch, lowerer-side validation, MCP
// `list_api`) import from here so a future addition to `EdgeQuery` /
// `FaceQuery` only requires updating these arrays once.
//
// Lives under `src/intent/` (vocabulary), not `src/backends/occt/`, so that
// agent-facing layers (capture, MCP) don't import OCCT-backend modules
// directly. The `EdgeQuery` / `FaceQuery` TYPES still live with the OCCT
// implementation; only the key arrays move with this slice.
//
// The arrays are typed `ReadonlyArray<keyof EdgeQuery>` (etc) so an INVALID
// key in the array fails at compile time. The Exclude-extends-never check
// below also catches the REVERSE direction: a key added to the type but
// missing from the array (rc.9 review I1).
import type { EdgeQuery, FaceQuery } from '../backends/occt/edgeQueries';

export const EDGE_QUERY_KEYS: ReadonlyArray<keyof EdgeQuery> = [
  'atZ', 'atX', 'atY', 'near', 'within', 'parallel', 'perpendicular',
  'convex', 'concave', 'minAngle', 'maxAngle', 'ofCurveType',
  'tolerance', 'angleTolerance',
];

// Compile-time exhaustiveness: if a future rc adds `EdgeQuery.spiralRate`
// without updating EDGE_QUERY_KEYS, `Exclude<keyof EdgeQuery, ...listed>`
// becomes `'spiralRate'` (not `never`), and the assignment below fails to compile.
type _EdgeQueryKeysMissing = Exclude<keyof EdgeQuery, typeof EDGE_QUERY_KEYS[number]>;
const _edgeKeysExhaustive: [_EdgeQueryKeysMissing] extends [never] ? true : false = true;
void _edgeKeysExhaustive;

export const FACE_QUERY_KEYS: ReadonlyArray<keyof FaceQuery> = [
  'atZ', 'atX', 'atY', 'parallelTo', 'inPlane', 'ofSurfaceType',
  'containsPoint', 'near', 'tolerance',
  'byNormal', 'minArea', 'maxArea', 'boundingBoxIn',
];

type _FaceQueryKeysMissing = Exclude<keyof FaceQuery, typeof FACE_QUERY_KEYS[number]>;
const _faceKeysExhaustive: [_FaceQueryKeysMissing] extends [never] ? true : false = true;
void _faceKeysExhaustive;
