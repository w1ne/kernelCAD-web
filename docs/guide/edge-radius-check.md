# Check edge breaks and fillet radii

`verify({ check: 'edge-radius', ... })` checks a general edge-break specification
against the final BREP. Use it for an edge safety or drawing radius requirement.
Its limits are geometric specifications in millimetres.

```json
{
  "check": "edge-radius",
  "file": "examples/edge-radius/rounded-block.kcad.ts",
  "min_radius_mm": 1,
  "max_radius_mm": 3,
  "require_edge_break": "external"
}
```

The example's R2 fillets pass. A minimum of 3 mm produces `min-radius`
violations; a maximum of 1 mm produces `max-radius` violations. An unfilleted
box with `require_edge_break: 'external'` produces twelve sharp-edge violations.
A radius bound alone checks existing fillets and permits sharp edges when fillets are also covered; a selection containing no fillet patches returns `no-coverage`. Declare
`require_edge_break` to prohibit sharp convex (`external`), concave (`internal`),
or both (`all`) edges. An internal requirement includes pocket-bottom edges;
a hole mouth is an external material rim.

The response carries `source: 'local'`, `status`, `checkedEdges`, `checkedFillets`,
and `bodies[]`. Each body identifies its part and solid index and reports:

- `edges[]`: topology refs, adjacent face refs, local sample point, kind and side.
- `breaks[]`: one entry per detected fillet face or chamfer strip, with its face
  ref, boundary edge refs, surface type and `radiusMm`.
- `violations[]`: rule, offending topology ref, measured value and limit.
- `unknownRefs[]`: unsupported geometry or unresolved selected refs.

`checkedFillets` counts face patches, including spherical corner junctions. A
fully rounded box has twelve cylindrical patches and eight spherical junctions.
The check measures cylinder/sphere radii from surfaces and torus minor radii
from surface derivatives. Full bores and bosses are excluded, and curved faces
must have tangent support boundaries along cylinder generatrices or torus major-circle rails to qualify as blends. Feature parameters
alone do not establish a measured radius.

Planar chamfers have `radiusMm: null`; radius bounds apply only to fillets.
A geometric chamfer strip has two parallel long rails between larger planar
support faces. This recognition is heuristic because BREP has no authoring
intent. Its rails count as chamfered; end edges are checked independently.
Cone countersinks and short/nonrectangular bevels are outside strip recognition.
This check does not measure a chamfer's edge-break distance.

## Limit the selection

`feature_id` chooses a lowered feature instead of the script's returned model.
For an assembly, `assembly` chooses its name and `parts` lists explicit part
names; omit `parts` to check all of that scene's parts. Each disconnected solid
gets a body report; selected non-solid topology is retained in an additional unsupported report. Intermediate helper shapes are excluded by default.

`edges` accepts an existing `EdgeQuery`, an `@kc[...]` ref, or an array of refs.
`faces` accepts a `FaceQuery` or face ref(s). Both filters intersect. Face filters
include incident edges and radius patches on selected faces; edge filters include
radius patches touching a selected boundary. Recognition still uses the full
body, so filters cannot remove support geometry from recognition.

```json
{
  "check": "edge-radius",
  "file": "examples/edge-radius/rounded-block.kcad.ts",
  "min_radius_mm": 3,
  "faces": { "ofSurfaceType": "CYLINDER" }
}
```

This selects twelve R2 cylindrical patches and fails. `near` sorts results in
existing queries; it does not limit them. Query coordinates and reported points
are part-local, before assembly placement. Refs use the feature id, or the
assembly part name; edge/face indices refer to that part's complete final shape.

`pass` means the selected supported geometry meets the declared rules. `fail`
means there are measured violations, `partial` means some selected geometry or
refs are unresolved, and `no-coverage` means nothing was checked. Only `pass`
sets `ok: true`. Periodic seams and zero-length pole edges are reported but
excluded from coverage. Open/nonmanifold edges and freeform blend radii cannot
pass; normal continuity and convexity are sampled at three interior edge points, with a 0.0001 degree normal tangency tolerance.

This is local geometric validation, separate from deployment, simulation and
hardware acceptance. It does not certify machining-tool access, CNC internal
corner clearance, physical surface finish or the strength of an edge treatment.
