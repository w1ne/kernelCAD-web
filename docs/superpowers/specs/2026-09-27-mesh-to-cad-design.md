# Browser mesh-to-CAD conversion

Date: 2026-09-27
Status: Initial scope approved in conversation; written specification ready for review.

## Outcome

Import a local STL, OBJ, or GLB mesh, recover supported analytic CAD faces,
retain unrecovered geometry as facets, and export STEP entirely in the browser.
The first release recovers planes and cylinders. Spheres, cones, and tori are
follow-up surface types behind the same recognition interface.

This produces BREP geometry, not a reconstruction of the original sketch or
feature history. Open results remain explicitly identified as open shells;
the application must not advertise every converted file as a usable solid.

## Existing foundations

- `src/kernel/backends/occt/occtBackend.ts` provides `fromTriangleMesh` and
  `exportSTEPAsync`. The former builds individual triangular faces, sews them,
  and attempts to construct a solid. It is a useful faceted foundation, but
  its current shape-type and builder-success checks are insufficient evidence
  of valid closure for this new workflow.
- `tests/unit/backends/occt/occtBackend.fromTriangleMesh.test.ts` verifies a
  cube's volume, bounds, and malformed-array rejection.
- `src/modeling/parts/fetchPart.ts` currently caches downloaded mesh assets
  without a BREP shape. Local browser conversion must not use this network
  path to process a user's file.
- `src/shared/worker/workerTypes.ts` and `geometryEngine.ts` establish worker
  request conventions, but their current export requests execute model code.
  Mesh conversion needs an independent worker lifecycle so cancellation does
  not interrupt an existing modeling session.
- `src/studio/StudioShell.tsx` composes the Studio UI. The conversion interface
  should be a focused dialog opened from existing Studio controls.

## Approach and alternatives

Prefer a compatible third-party recognizer behind a neutral adapter, while
retaining OpenCascade for BREP construction, validation, and STEP export.
This avoids introducing another modeling kernel into the application.

A fully in-house recognizer offers control but adds fitting and segmentation
work. A faceted-only converter is easier but does not meet the approved
analytic-recovery requirement. Neither should be silently presented as the
full feature.

The screenshot credits Michael Molinari's RANSAC library. Discovery located
references to `BREP_RANSAC` and `mmiscool/NURBS_BREP_kernel`, but the advertised
GitHub repository returned 404 during this investigation. GitHub's public
repository listing for that account did not expose that repository or a
standalone RANSAC repository. `mmiscool/BREP` resolves to `mmiscool/BREP.io`;
GitHub reports its license as `NOASSERTION`, which does not establish usable
terms for the desired recognizer.

Before adopting code, obtain the actual source/package, inspect its license,
pin its version and provenance, and verify a minimal browser-worker build.
Search results alone are not dependency verification. If the package remains
unavailable or unsuitable, report that result and propose an independent
planes/cylinders implementation; do not copy unverified source or quietly
reduce the release to faceted conversion.

## User workflow

1. Open **Convert mesh to CAD** and select or drop an STL, OBJ, or GLB file.
2. Choose source units and an absolute fitting tolerance in millimetres.
   STL and OBJ have no reliable unit metadata, so show the choice explicitly.
   GLB defaults to metres converted to millimetres and applies node transforms.
3. Inspect input triangle/body counts and start conversion.
4. Show progress by stage: reading, preparing, recognizing, reconstructing,
   validating, and exporting. Provide cancellation throughout the job.
5. Preview the result and report recovered surface area, residual facets,
   geometric deviation, and valid solid/open shell/invalid status.
6. Download STEP for valid solids or valid open shells. Clearly label open
   shells. Invalid BREP cannot be downloaded as a successful conversion.

The first release is a conversion workflow with a result preview and STEP
download. Persisting imported geometry into the parametric project history,
CLI/MCP entry points, and feature-history inference are separate extensions.

## Data flow and boundaries

### Local file decoding

Decode files to neutral indexed triangle arrays, body names, and transforms.
Use existing Three.js loader capabilities where suitable. OBJ materials and
GLB textures are unnecessary for geometric conversion. Do not fetch referenced
external assets. Reject unsupported compression, external buffer references,
or unsupported primitives with actionable format-specific errors.

Apply GLB instance/world transforms, handle reflected winding, and normalize
coordinates to millimetres before recognition. Preserve disconnected bodies
and names instead of connecting unrelated parts. Validate finite coordinates,
index bounds, empty input, and resource limits before kernel allocation.

### Mesh preparation

Weld within a stated preparation tolerance, detect degeneracy, and build
triangle adjacency. Report removed triangles and boundary/non-manifold edges.
Do not silently fill holes or discard meaningful geometry. Preserve a mapping
back to source triangles for coverage and error calculations.

### Recognition adapter

The recognizer receives the prepared mesh, fitting tolerance, and a fixed
random seed. It returns connected plane/cylinder patches with fitted analytic
parameters and source triangle membership, plus residual triangles.

Recognition must be deterministic for a fixed input and configuration. Split
disconnected coplanar regions, retain hole boundaries, and reject overlapping
triangle assignments. Validate recognizer output independently of its own
confidence scores. The adapter must not expose library-specific objects to
the reconstruction layer.

### OpenCascade reconstruction

Build trimmed analytic faces from accepted patches. Shared boundaries must be
geometrically consistent; recognizing a cylinder alone is not sufficient to
replace its triangles. Handle cylindrical seams and trim loops explicitly.

If a patch cannot be trimmed, sewn, or validated within tolerance, preserve
that patch as facets and explain the fallback. Account for every retained
source triangle exactly once. Assemble each connected body independently.
Construct solids only from proven closed, orientable shells and run BREP
validity checks. Preserve valid open shells rather than forcing a solid cast.

Measure deviation from the source mesh using vertices and interior samples in
both directions; distinguish sampled estimates from mathematical guarantees.
Vertex residuals alone must not qualify a coarse polygonal cylinder as an
accurate smooth replacement. Recovery metrics count only analytic faces that
survive reconstruction and validation, not merely recognized candidates.

Keep new reconstruction helpers separate from the existing `fromTriangleMesh`
path so SDF materialization retains its established behavior.

### Worker and presentation

Use a dedicated, lazily created worker with transferable input/output buffers,
job IDs, stage progress, and typed errors. Terminating the worker cancels even
blocking recognition/kernel calls. Ignore results from obsolete jobs, dispose
preview resources, and recreate the worker on retry. Release WASM objects on
success and failure. Add configurable input/resource limits with explicit
errors instead of silently decimating an input.

Return STEP bytes, lightweight preview geometry, per-body validity, and a
conversion report. Model bytes remain local; application assets may load over
the network, but conversion must never upload model data.

## Acceptance evidence

- Triangulated cube: six analytic planar faces, preserved dimensions and
  volume, valid solid, STEP re-import succeeds.
- Closed tessellated cylinder: analytic cylindrical side and planar caps when
  the requested tolerance allows the mesh-to-surface deviation; tighter
  tolerance causes honest fallback. Include a rotated cylinder fixture.
- A planar region with a hole: no filled hole or spurious bridge.
- Mixed supported and unsupported surfaces: no missing triangles, honest
  coverage, and residual facets survive STEP round-trip.
- Open mesh: reported/exported as a valid open result when reconstruction
  permits; never falsely labeled a closed solid.
- Disconnected bodies and reflected GLB instances: preserve placement, scale,
  orientation, and body identity.
- Non-finite, empty, degenerate, malformed, non-manifold, and oversized inputs:
  deterministic diagnostics without a worker crash or a misleading success.
- Browser tests: local file selection, progress, cancellation during work,
  retry, stale-job suppression, preview, and STEP download. Observe network
  requests to confirm no model upload or external asset fetch.
- Inspect representative result previews visually and verify STEP re-import
  using OpenCascade, checking surface types, bounds, volume where applicable,
  topology validity, and reported deviation.
- Run relevant existing mesh/SDF/STEP-export tests and repository typecheck
  to catch regressions. Record measured performance and tested mesh sizes;
  do not claim arbitrary-size support from a small fixture.

## Delivery sequence

1. Resolve and test the recognition dependency before committing to its API.
2. Implement neutral mesh decoding/preparation and conversion report contracts.
3. Prove planar and cylindrical recovery through validated STEP round-trips.
4. Add residual-facet/open-shell handling and mixed-body coverage evidence.
5. Wire the dedicated worker and Studio conversion dialog with preview.
6. Run geometry and browser acceptance checks and document measured limits.

No new production dependency has been selected, and no conversion
implementation is claimed by this specification.
