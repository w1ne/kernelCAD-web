// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
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
} from './queryEvaluator';

// Q7 — @kcq[...] string DSL parser + canonical serializer. Importing
// parseQuery runs the __installQueryStringifier side-effect that lets
// Query.toString() emit the canonical @kcq[...] form instead of the
// pre-install debug fallback.
export { parseQuery, formatQueryAsString } from './parseQuery';

// Q7 — strings-as-sugar bridge per D0.9 (b): compile an F-surface-parsed
// TopoRef into the equivalent Query AST. Every @kc[<owner>/<kind>/<name>]
// ref maps to a kind-filter Query so the same evaluator handles both
// string surfaces.
export { topoRefAsQuery } from './topoRefAsQuery';

// Q7 — MCP-boundary dispatcher per spec §3.7. The single entry-point
// every MCP tool input goes through. Dispatches on prefix: @kc[...] to
// parseTopoRef + topoRefAsQuery, @kcq[...] to parseQuery, JSON-AST to
// makeQuery, Query value passthrough. Replaces the Q3 stub of the same
// name that only routed strings through q.fromString.
export { parseAnyTopologyInput } from './parseAnyTopologyInput';
