# Catalog Connector Manifests Design

**Decision status:** Approved by the user's repeated direction to implement universal, component-aware catalog parts and to proceed autonomously.

**Problem:** A catalog part can be a real imported STEP model but lose its authored mating interfaces when it crosses the ingest, remote-catalog, and fetch boundaries. The runtime then invents generic box and hole frames from the exported geometry. That is useful only as a fallback; it does not make an electronic carrier, servo, or other universal catalog component component-aware.

## Options considered

1. **Keep generic STEP synthesis only.** It needs no schema changes but cannot represent electrical contacts, board seating planes, or a servo output axis honestly.
2. **Hand-maintain unbound JSON frames in each remote record.** It is easy to add, but a regenerated STEP can silently move the geometry while retaining stale frames.
3. **Use a hash-bound authored connector manifest (selected).** A source model exports numeric, named frame/axis connectors to a sidecar; ingestion binds the sidecar to the exact STEP SHA-256; the remote fetcher verifies and attaches those interfaces. Generic synthesis remains available only where no authored manifest exists.

## Architecture

`ConnectorManifest` remains the version-1 authoring format for local bundled sidecars. A `HashBoundConnectorManifest` adds `geometrySha256`; it is the only form a remote catalog may advertise. The canonical remote record carries it alongside the existing discovery-only `connectors` string list.

The source-to-runtime path is:

```text
authored Scene .connector() frames
  -> numeric manifest sidecar
  -> STEP export + SHA-256 binding during ingest
  -> catalog detail/index record
  -> remote adapter validation
  -> verified STEP download
  -> exact session auto-connectors
```

If a record has no manifest, the existing geometry inspection and generic connector synthesis remain unchanged. If a manifest is present but invalid, mismatched with the record identity, or bound to a different SHA-256, ingest/fetch must fail rather than silently replace it with guessed frames.

## Manifest contract

```ts
interface HashBoundConnectorManifest extends ConnectorManifest {
  geometrySha256: string;
}
```

Validation rules:

- schema version remains exactly `1`;
- `partId`, `family`, and all connector names are non-empty and safe for the existing topology-reference grammar;
- connector names are unique globally within a manifest;
- each origin and frame/axis direction is a finite numeric three-vector;
- every normal/axis is non-zero;
- `geometrySha256` is lowercase hexadecimal with exactly 64 characters;
- the bound part id, family, and geometry hash exactly match the catalog record being consumed.

The initial version deliberately supports only numeric `frame` and `axis` connectors. Topology-backed, `planar`, and `ball` connector origins cannot remain stable outside the originating capture graph and are rejected by authored export.

## Assembly mating bridge

An attached interface must be more than a display label. The existing session auto-connector map is a lossy discovery cache and is not automatically part of an assembly's mate resolver. A separate typed `catalogConnectors` map, keyed by fetched Shape id, stores the verified `ConnectorEntry[]` exactly as declared in the manifest. It keeps `frame` versus `axis` semantics and never mixes a factual catalog interface with a generic generated frame. When `assembly.part(name, fetchedShape)` is called, KernelCAD promotes only that typed payload into both compatible assembly connector forms:

- the legacy inline frame map, so `partRef.connector(name)` can be used for connection placement;
- the mate-style connector array, so `assembly.mate('...', 'part.interface', 'other.interface', ...)` resolves directly.

Generic STEP-synthesized connectors remain discovery aids and are not promoted automatically. This distinction prevents a guessed bounding-box face from being represented as a factual component interface. A duplicate between an explicit assembly connector and an authored catalog interface is a capture-time error, so neither source silently overrides the other.

The bridge applies any existing rigid `Shape.translate()` and `Shape.rotate()` transforms to catalog frames before registering them. It rejects scale and reflection on a catalog-attached Shape because they would invalidate a universal component's physical interface rather than merely place it. Boolean, mirror, pattern, and other derived shapes have a new feature id and intentionally do not inherit catalog interfaces in this first slice.

## Authoring and universal-component policy

The export helper derives coordinates from the recomputed `SceneBackend` and the matching `assemblyPart` records, not from capture-time `ScenePart.worldTransform` alone. `assembly.part(..., { at })` is baked into the lowered part shape before the SceneBackend applies its world transform, so the exact transform used by STEP export is `worldTransform ∘ translate(assemblyPart.at)`. The helper applies that transform to every numeric origin and direction. It rejects a connector that cannot be mapped unambiguously to one direct assembly part.

Version 1 permits direct, mate-free component assemblies only. It rejects scenes with mates or joint-driven source records rather than emitting potentially stale frames. This supports multi-solid universal component models and explicit `at` placements while avoiding a false claim that a dynamic mechanism has one fixed catalog interface pose.

The first universal components that use this path are the A4988 StepStick-compatible carrier and SG90-class micro servo. Their interfaces describe only modeled and source-supported features:

- A4988: actual plated through-hole contacts and the carrier solder-side seating plane; no fictional mounting holes or project-specific X/Y motor labels.
- SG90: the three modeled cable-contact faces and an explicitly envelope-only output-axis alignment; no universal horn spline, torque, or mounting-hole claim until a selected, source-verified variant supports one.

## Error handling and compatibility

Bundled local sidecars still use unbound `ConnectorManifest` and retain their existing best-effort attachment semantics. Remote manifests are a stronger contract: they are verified after byte integrity verification and before import enrichment. A malformed or mismatched advertised manifest is a catalog integrity failure, not a reason to fall back to generic frames.

Third-party records that do not advertise a manifest remain compatible and receive the existing generic synthesized connectors at fetch time.

## Testing strategy

Each behavior is driven test-first:

- shared manifest tests cover hashes, binding, duplicate names, finite vectors, and zero directions;
- adapter tests prove a valid remote manifest survives mapping and exposes authored names;
- ingest tests prove a raw sidecar becomes bound to the exact emitted STEP hash;
- fetch tests prove manifest-backed parts attach exact interfaces without running generic synthesis, while no-manifest parts keep synthesis;
- Scene-export tests prove transforms are applied and unsupported connector origins reject;
- authored-part tests assert the A4988/SG90 manifests contain only factual, stable interfaces.

## Scope boundary

This design fixes catalog interface provenance. It does not claim that a device is LabWired-proven, does not alter ProtoCat publication state, and does not fabricate unavailable power, charger, programmer, belt, or mounting hardware. Those are separate evidence and hardware-design decisions.
