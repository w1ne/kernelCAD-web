# Design intent

This is a local visual refinement of three existing generic construction-equipment scene assets. The prior 3/4 preview for each was dominated by a few large blocks, so the source now gives each object the parts that identify it at catalog scale.

- The towable light tower uses a two-stage mast, visible lamp lenses, a generator enclosure, road wheels, a towing tongue and four screw-jack outriggers. Mast extension and lamp count change the rendered shape.
- The ride-on trowel uses two hollow guard rings with separate radial blade shoes, a narrow chassis bridge, engine housing, seat and paired steering levers. Rotor diameter and blade count change the rendered shape.
- The batch plant uses 2/3/4 raised storage bins with tapered outlets, a shared feed belt, a visible central mixer, an access ladder and a silo on a steel frame. Bin count and silo-body height change the rendered shape.

Each asset keeps its existing overall-scale control and named weathered/highVisibility palettes. Four material-named color controls describe the visible paint, steel, rubber, lens, aggregate-bin, silo or seat zones. No kit or asset IDs change, and no manufacturer-specific dimensions, logos or meshes are copied. All geometry remains low-poly scene visualization; there are no operating, performance, safety, manufacturing or deployment claims.

## Verification plan

Build each edited source and render its default plus one authored shape choice and both named palettes. Render all 60 construction-equipment catalog previews, rebuild catalog/index.json, check all 60 source hashes and preview paths, build the local static catalog pages, run the catalog quality gate, ESLint for the kit, and catalog integration tests. Open the three final default previews and the parameter/preset variants.

The deterministic inspection CLI is attempted against the already-running Chrome CDP session. If attachment fails, do not launch another browser; keep the exact failure and use the checked-in software-rendered catalog previews for local visual review.
