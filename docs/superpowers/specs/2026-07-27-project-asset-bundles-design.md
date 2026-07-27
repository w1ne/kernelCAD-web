# Project Asset Bundles

## Problem

KernelCAD currently persists hosted projects primarily as `.kcad.ts` source text.
Scripts that reference local complementary files, such as:

```ts
const keycap = await lib.fromSTEP('./2.0u_blank_costar.stp');
```

cannot be reproduced by the hosted evaluator unless that file happens to exist
on the server. The Studio UI enters a generic “Geometry kernel warming up”
state, and gallery publishing can accept the source even though the resulting
project is not reproducible.

This produced four visible failures:

1. A valid local project was published without its STEP dependency.
2. The hosted evaluator reported a missing file only after an extended warm-up.
3. Substituting self-contained construction geometry exposed intermediate
   cutters and caused z-fighting in Studio.
4. The gallery project diverged from the locally verified manufacturing model.

## Goals

- Persist a project’s source and complementary files as one reproducible,
  immutable version.
- Reuse the existing asset/part-library blob storage rather than creating a
  second object store.
- Preserve source-relative paths so existing `lib.fromSTEP`, `lib.fromSTL`,
  `fontPath`, SVG, DXF, texture, and reference-image calls need no syntax change.
- Make missing or invalid assets fail immediately with a precise diagnostic.
- Publish gallery entries from the same validated project version used by
  Studio and export.
- Render only returned/root geometry by default. Construction history remains
  inspectable but hidden.

## Non-goals

- General-purpose cloud-drive behavior.
- Mutable files inside an immutable project version.
- Resolving arbitrary host filesystem paths in hosted execution.
- Automatically publishing private project assets to a public gallery.
- Replacing the catalog/part library.

## Architecture

### Content-addressed assets

The existing asset/part-library storage is the single blob store. Every uploaded
file is normalized to bytes, hashed with SHA-256, and stored once.

An asset record contains:

- `sha256`
- byte length
- media type
- detected format
- original filename for display only
- ownership and access metadata
- storage key
- creation timestamp

The storage key derives from the hash, not the user-supplied filename.
Identical files deduplicate across versions while access remains governed by
project ownership and visibility.

### Immutable project-version manifest

Each project version contains:

- the `.kcad.ts` source
- source hash
- a manifest of normalized relative paths to asset hashes
- parameter metadata
- author and timestamp
- validation status and diagnostics
- optional derived artifacts and preview metadata

Example:

```json
{
  "version": 7,
  "sourceSha256": "...",
  "assets": {
    "2.0u_blank_costar.stp": {
      "sha256": "...",
      "format": "step",
      "byteLength": 608247
    }
  }
}
```

Paths use forward slashes, cannot be absolute, cannot contain `..`, and compare
case-sensitively. Duplicate normalized paths are rejected.

Updating source or any attachment creates a new project version. Older versions
remain reproducible, and every gallery entry pins an exact version.

### Upload and persistence API

Project creation/update accepts:

- source code
- title and parameter metadata
- zero or more attachments, each with a relative path and bytes or an existing
  authorized asset hash
- optional existing project slug

The server performs:

1. Size, extension, media-type, and format validation.
2. Path normalization and traversal rejection.
3. Blob hashing, deduplication, and persistence.
4. Static source dependency discovery.
5. Manifest completeness validation.
6. Hosted evaluation against the immutable bundle.
7. Atomic project-version publication only if persistence succeeds.

Dependency discovery is advisory for dynamic paths but authoritative for literal
relative paths. A literal missing dependency prevents the version from becoming
the project’s active version.

The MCP `open_in_studio` interface gains an `attachments` collection. Local
clients send file paths; the connector reads them and uploads bytes. Remote
clients send platform file references or previously authorized asset hashes.
Source-only calls remain supported for self-contained projects.

### Hosted filesystem resolver

Hosted evaluation receives a project-version asset resolver, not unrestricted
host filesystem access. Existing authoring calls continue to accept relative
paths:

```ts
await lib.fromSTEP('./2.0u_blank_costar.stp');
await lib.fromSTL('./insert.stl');
fontPath('./fonts/legend.ttf');
```

The resolver:

1. Normalizes the requested path relative to the virtual source directory.
2. Rejects absolute paths and traversal.
3. Resolves the normalized path through the version manifest.
4. Fetches bytes from the shared blob store.
5. Supplies a read-only cached local representation to the existing lowerer.

The resolver is injected as an execution capability so CLI/local execution can
continue using the real filesystem while hosted execution uses the manifest.

### Gallery publication

Gallery entries reference a validated public project version:

```json
{
  "projectSlug": "make-no-mistakes-keycap",
  "projectVersion": 7
}
```

Gallery build and Studio both consume that version’s source and manifest.
Previews and exports are derived from the same root geometry. Publication fails
closed when:

- the version is private,
- an attachment is unavailable,
- hosted evaluation fails,
- the returned geometry is empty or invalid, or
- required preview/export generation fails.

The gallery never substitutes fallback geometry.

### Root geometry visibility

The modeling capture graph distinguishes:

- returned/root features,
- their required dependencies,
- construction/intermediate features.

Studio displays only returned root shapes or returned Scene parts by default.
Dependency meshes remain available for the feature tree and explicit inspection
but are not added as visible scene objects. Boolean cutters therefore cannot
appear as giant spheres, and predecessor/successor bodies cannot z-fight.

An explicit “show construction geometry” diagnostic mode is outside this
feature’s scope.

## User experience and failure behavior

The generic warm-up banner is limited to actual kernel initialization. Project
loading has explicit phases:

- Loading project
- Fetching attachments
- Evaluating geometry
- Preparing viewer

Each phase has a bounded timeout and abort signal. A known failure immediately
replaces progress UI with a diagnostic. Examples:

- `project.asset.missing — 2.0u_blank_costar.stp`
- `project.asset.path-traversal`
- `project.asset.unsupported-format`
- `project.version.evaluation-failed`
- `project.gallery.root-geometry-invalid`

The UI never continues showing “warming up” after an error is known. Retrying
restarts only the failed phase.

## Security and limits

- Reject absolute paths, traversal, NUL bytes, and ambiguous normalized paths.
- Verify content signatures where formats provide them; do not trust extensions.
- Apply per-file, per-version, and account quotas before upload completion.
- Stream large files and compute hashes incrementally.
- Never expose another project’s hash as proof of authorization.
- Public gallery publication requires an explicit visibility transition.
- Serve downloads with safe content disposition and immutable cache headers.

Initial supported attachment formats are STEP/STP, STL, BREP, DXF, SVG, TTF,
OTF, PNG, JPEG, WEBP, HDR, EXR, GLB, and 3MF. Executable formats are rejected.

## Data lifecycle

Project deletion removes manifest references, not shared blobs immediately.
Unreferenced blobs become eligible for delayed garbage collection. A retention
window allows recovery from accidental deletion and avoids races with gallery
builds or in-flight exports.

Derived previews and exports are keyed by:

- project-version identity,
- parameter overrides,
- exporter/render version,
- output options.

They can be regenerated and do not define project truth.

## Testing

### Storage and manifest

- Hash deduplication across projects and versions.
- Same filename with different bytes creates distinct assets.
- Traversal, absolute paths, duplicate normalized paths, and quota overflow fail.
- Version updates are atomic and older versions remain reproducible.
- Unauthorized hash reuse is rejected.

### Resolver

- Local CLI continues resolving filesystem-relative imports.
- Hosted execution resolves every supported asset type through a manifest.
- Missing literal and dynamic paths return precise diagnostics.
- Resolver cache does not leak assets across projects.

### Publishing

- `open_in_studio` uploads source plus attachments and updates the same slug.
- A project with `lib.fromSTEP('./part.step')` evaluates remotely.
- Source-only publication with a missing dependency fails before activation.
- Gallery build consumes the pinned project version and emits matching preview
  and export artifacts.

### Rendering

- A subtractive sphere cutter is absent from the default visible mesh set.
- A filleted successor does not render over its predecessor.
- Returned multi-part Scenes retain per-part materials without orphan warnings.

### UI

- Warm-up state ends on success, timeout, or error.
- Missing assets display their exact normalized path.
- Retry restarts the failed phase.
- A gallery publish action cannot proceed from an invalid version.

## Rollout

1. Add content-addressed project asset records and immutable manifests.
2. Add attachment upload and hosted resolver support behind a feature flag.
3. Extend `open_in_studio` and Studio project loading.
4. Enforce root-only default visibility.
5. Add project-version-backed gallery publication.
6. Migrate eligible existing projects as source-only bundles.
7. Enable attachment-backed publication by default.

The existing source-only flow remains compatible for self-contained models.
Projects with unresolved relative imports become explicitly invalid instead of
appearing to load indefinitely.
