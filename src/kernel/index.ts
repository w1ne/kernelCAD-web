// src/kernel/index.ts
//
// Top-level kernel barrel — re-exports the public-within-the-monorepo
// surface that sibling modules (modeling/, agent/, studio/) consume.
//
// Today this barrel re-exports the Query DSL type surface so authoring
// layers can pull `q` and the `Query<T>` family from one stable path.
// Other kernel exports (OcctBackend, naming primitives) continue to live
// under `./naming` and `./backends/occt/` and will be lifted here as
// downstream slices consolidate.

export { q } from './naming/queryConstructors';
export type {
  Query,
  QueryAst,
  QueryKind,
  GeometryType,
  ResolvedEntity,
  QueryScene,
  EntityMarker,
  FaceMarker,
  EdgeMarker,
  VertexMarker,
  ConnectorMarker,
  PartMarker,
  SolidMarker,
} from './naming/query';
