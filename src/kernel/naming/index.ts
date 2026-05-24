// src/kernel/naming/index.ts
//
// Public-within-the-monorepo barrel for the topology-naming machinery.
// Slices B (mates) / C (bundled connectors) / E (DFM findings) import
// from here while F-foundation ships before F-surface — the user-visible
// MCP / SKILL / KernelError.hint integration of @kc[...] refs lands in
// F-surface (Tasks F2-F6).
//
// Internal use only. Do not re-export from src/index.ts until F-surface
// is ready to lift the contract to the user-facing surface.

export {
  parseTopoRef,
  formatTopoRef,
  type TopoRef,
  type TopoKind,
  type TopoModifier,
  type TopoRefParseError,
  type FormatTopoRefParts,
} from './topoRef';

export {
  resolveTopoRef,
  type TopoResolveContext,
  type TopoResolveResult,
  type TopoResolveWarning,
} from './resolveTopoRef';

export {
  assertTopoRefSafeName,
  TOPO_REF_NAME_REGEX,
  RESERVED_TOPO_REF_CHARS,
} from './uniquenessValidator';

// Lineage walk helpers — already shipped, re-exported so sibling slices
// don't have to reach past the naming/ directory boundary.
export {
  findLineageMatches,
  findFallbackSnapshot,
  parseFaceSelector,
  type ParsedSelector,
  resolveBySnapshot,
} from './selectorParser';

export {
  findByGeometrySnapshot,
  type SnapshotTolerance,
  type SnapshotMatchResult,
} from './geometrySnapshotFallback';

// Re-exported so consumers using TopoResolveContext.currentShape: OcctBackend
// can construct + type-narrow contexts without reaching past the naming/
// directory boundary.
export type { OcctBackend } from '../backends/occt/occtBackend';

// ---------------------------------------------------------------------------
// Query DSL — type surface re-exports. The evaluator and string-DSL parser
// land in later slices and will be re-exported here as they ship.
// ---------------------------------------------------------------------------

export {
  makeQuery,
  type Query,
  type QueryAst,
  type QueryKind,
  type GeometryType,
  type EntityMarker,
  type FaceMarker,
  type EdgeMarker,
  type VertexMarker,
  type ConnectorMarker,
  type PartMarker,
  type SolidMarker,
  type ResolvedEntity,
  type QueryScene,
} from './query';

export { q } from './queryConstructors';

// Q3 — evaluator entry points + strings-as-sugar bridge. The chainable
// `.evaluate(scene)` / `.evaluateUnique(scene)` methods on Query values
// delegate to these same module-level functions via the install pattern
// in query.ts, so both call sites bottom out on one code path.
export {
  evaluate,
  evaluateUnique,
  parseAnyTopologyInput,
} from './queryEvaluator';
