# kernelCAD authoring reference — Workflow

The full authoring, inner render and assembly/mechanism loops, the source/artifact policy, and vendor geometry. SKILL.md has the essentials; this file has the detail.

## Agent authoring loop

Use this loop for every non-trivial model edit:

1. **Classify the job**: blockout, production-ish part, reference replication, assembly/mechanism, sheet metal, or standard-part integration. Load the matching specialty skill before editing. Words like *real*, *production*, *complex*, *enclosure*, *gearbox*, *bearing housing*, *robot arm* → production-ish / mechanism — `lookup_cookbook("multi-feature machined housing")` or `lookup_cookbook("multi-body mechanism real proportions")`, and prefer MCP `design_loop` until green (see `docs/agent/adam-quality-bar.md`). Do not ship stacked-primitive toys for those prompts.
2. **Write the design brief in plain engineering terms**: purpose, external dimensions, interfaces, materials/finish if relevant, moving parts, manufacturability assumptions, and what must be proven. If the request is ambiguous on load-bearing parameters — overall dimensions, units, symmetry, part count, fit/clearance targets — ask 1–3 targeted clarifying questions BEFORE generating geometry; if you proceed anyway, list each assumption in the brief and encode it as a named `param()` so the user can correct it without a rewrite. Do ParamRef arithmetic with methods, not operators: `w.add(5)`, `w.subtract(t)`, `w.multiply(2)`, `w.divide(4)`, `w.negate()`.
3. **Map words to geometry**: turn important prompt phrases into named source sections, parameters, parts, connectors, materials, or tests so the generated model stays traceable to the user's words.
4. **Plan parameters and artifacts**: identify the `.kcad.ts` source file, named parameters, imported STEP files, expected exports, and the smallest verification command set before writing geometry.
5. **Edit source only**: treat `.kcad.ts`, prompt/brief markdown, and provenance metadata as source. Do not hand-edit generated PNG, MP4, STEP, STL, score JSON, or capture metadata.
6. **Generate explicit targets**: run the exact render/export/capture command for the requested artifact. Avoid broad directory refreshes unless the task is a release/demo rebuild.
7. **Validate deterministically**: run `kernelcad evaluate`, relevant exports, assembly/review tools, interference checks, and scorer gates before accepting visual evidence.
8. **Inspect visual artifacts honestly**: when a PNG/MP4/render is produced, open/read it and report what is visible. If the image shows wrong proportions, floating parts, occlusion, unreadable details, or a bad camera crop, repair source and regenerate.
9. **Packetize visual evidence**: when visual evidence matters, run `kernelcad render inspect <file> <outDir>` to produce a deterministic inspection bundle: a manifest naming the source file, command, generated artifacts, and caveats, plus canonical RGB views. Add `--channels rgb,mask,depth,normals` when machine-readable object masks, depth, or view-space normals are needed. Use `--focus <names>` or `--hide <names>` to isolate feature ids or assembly part names when clutter would obscure the check. Keep richer channels in the same manifest packet; do not replace the canonical RGB views. Use `--shading flat` to expose tessellation / surface wobble (smooth vertex normals are the default), and `--screenshot-timeout <ms>` when a heavy single-span loft exceeds Playwright's 30 s default.
10. **Repair one cause at a time**: target the smallest source change that addresses the failing check, then rerun the same check. Do not loosen gates or silently skip failing evidence.
11. **Never present an unverified model**: if the latest `evaluate` failed, fix it or report the blocker — do not export, render, or hand over a script whose last check failed.

**Verify against geometry, not against your own summary.** Trust measured
evidence — exact bbox/volume from `inspect({ of: 'shape' })`/`inspect({ of: 'step' })`, interference
volumes, DFM findings, the rendered pixels — over the narrative of what the
script "should" have built. A green `evaluate` (`ok: true, featureCount: N`)
proves the script ran, not that the geometry is correct. When a check cannot
measure a thing (kernel error, unknown clearance status, an inconclusive
render), treat that uncertainty as a failure to resolve, not a pass to assume.

**Verify against the design intent, not just validity.** Diagnostics-clean is
necessary but not sufficient: a solid block is valid geometry and still fails
the design. Before finishing, re-read the request and confirm every must-have
feature is actually modeled — openings, cavities, wall thickness, separate
components, clearances, legroom, load paths, and the specified manufacturing
method. Fix the source until those are visibly satisfied.

**Check your work: render top, front and iso before calling a layout done.**
DFM checks walls, overhangs and clearance; it does NOT check whether text,
logos, slots or other decorations overlap holes, sit off the part, or collide
with each other. Only the pictures show that. Render
(`render_preview` / `kernelcad render`) the top, front and iso views and look
at each one before you report a layout as finished. For a whole part, check
the seven-view sheet (`render_preview({ file, sheet: true })`): done means
every tile matches the request, not that it compiles.

## Inner loop: render after every visible change

The authoring loop above is the *outer* loop. The *inner* loop runs after every feature you add that you expect to see in the rendered output. Skipping the inner loop is the single biggest cause of "tests green, output wrong" shipments.

After every one of these operations, render and look at the result:

- a new `subtract(...)` that should produce a visible hole, notch, or relief
- a new `union(...)` of shapes that should carry distinct materials
- a `material({...})` change on a body that should be visually distinct from its neighbors
- a new sketch + `extrude` whose orientation matters (i.e. anything front-facing)
- a parameter retune that should visibly move a feature

The minimum check:

```bash
node dist/cli/index.js render <file> -o /tmp/check.png --pose <scorer-pose> --hide-reference-images
```

Pick the pose the scorer uses (look in the task's `harness.ts` for `REFERENCE_POSE` — typically `30,15` for canonical 3/4 product shots). Render at default views (no `--pose` flag) only when you specifically want the front/right/top/iso composite — that view often hides defects visible at the scorer pose.

When you open the rendered PNG, ask three questions:

1. **Is the feature I just added visibly present?** If the subtract didn't punch through, the union didn't show a color delta, or the material change didn't render, the eval-harness JSON of `ok: true, featureCount: N` is lying about success. Fix the geometry, don't ship.
2. **Are features I didn't intend to change still where they were?** Material chaining, sketch reuse, and chained booleans regularly corrupt earlier features silently. Compare against the previous render.
3. **Does the silhouette match the reference at the same pose?** Not pixel-perfect — but the right number of openings, right proportions, right shape category.

If a render shows wrong proportions, hidden openings, floating parts, or unreadable details, repair `.kcad.ts` source and re-render. Do not pile features on top of broken geometry. Do not declare done until the most recent render shows the intent.

Common inner-loop traps are catalogued in the cookbook at
`kernelcad-nurbs/cookbook/snippets/your-first-real-build-anti-patterns.md`
(orientation defaults, sketch-axis sign flips, material-shadowing on union,
two-feature placement math, subtract-chain reliability, JSON-`ok`-is-not-visual-proof).

## Assembly and mechanism loop

`evaluate_script` on a model with mates runs only a shallow mechanism check.
It does NOT check joint-support intents (`jointSupport` / `mechanicalJoint`),
pose-envelope overlap at a declared mate limit, or a gravity drop / static hold,
so `ok: true` from it is not a mechanism verdict. When the result carries
`reviewHint`, run `review_cad` for the pose-envelope + gravity checks before you
call the mechanism done.

### Articulated-digit workflow (non-bypassable)

For an articulated digit, use the structural joint helper and complete every gate below:

<!-- ARTICULATED_DIGIT_EXAMPLE:START -->
```typescript
const arm = assembly('index-digit');
const minClearance = 0.1;
const parentMount = 'palm.index-mount';
const frame = { origin: [0, 0, 10], pinAxis: [0, 0, 1], forward: [1, 0, 0] };
const segments = [
  { name: 'proximal', lengthMm: 54, widthMm: 14, depthMm: 14, terminal: true },
];
const joints = [
  { name: 'mcp', limitsDeg: [0, 27], style: { knuckleR: 5.4, forkGapY: 10, pinCapThickness: 3 } },
];

arm.part('palm', box(20, 50, 20, true).translate(-10, 0, 0))
  .connector('index-mount', {
    type: 'frame',
    origin: { kind: 'vec3', value: [0, 0, 10] },
  });

joint.articulatedDigit(arm, {
  name: 'index',
  parentMount,
  frame,
  clearanceMm: minClearance + 0.1,
  segments,
  joints,
});

dfmSpec({ minClearance, includeArticulatedMates: true });

return arm.solvedModel({}, { validate: 'error' });
```
<!-- ARTICULATED_DIGIT_EXAMPLE:END -->

- Run the full `review_cad` review, including pose-envelope clearance and interference checks.
- Confirm visual fit separately: every digit link and moving mate must remain outside package keepouts across the reviewed pose envelope.
- Dynamics, load, and actuation claims are unverified without explicit evidence; articulated-digit geometry and clearance review do not certify payloads or actuation.
- These steps are mandatory. Do not bypass the helper, DFM declaration, pose-envelope review, keepout fit check, or evidence requirement by substituting raw offsets or a visual-only pass.

### Think in parts

- Every physically distinct component is a named `assembly().part(name, shape)` — one body per part unless the component is genuinely monolithic.
- Anonymous loose top-level bodies in a multi-body model are a defect smell: the review loop emits `assembly.structure.unstructured-bodies` (info) with the recovery hint. Wrap each loose body in a named part.
- Part names are the durable handles for `inspect --focus`, `inspect({ of: 'part-stats' })`, and Studio's hide / keep-whole / per-part validity — choose stable, descriptive names.

### Multi-member fabrications (frames, weldments, sheet on tubes)

A tube frame, weldment, rack, or tray is several members cut to length. Build it one of two ways:

1. **`assembly().part(name, member)` per member** — interference between parts is checked; every part's own unions get the same `union.*` checks below. Preferred when the members are bought or cut separately.
2. **One `union()` of members that touch but never overlap.** Members butt against each other: a cross member between two side rails is `span - 2 * railWidth` long and starts at `x = railWidth`, so its end faces sit on the rails' inner faces. The first and last cross members sit inside the frame, next to the front/back rails, not inside them. A sheet on top of the tubes sits at `z = tubeHeight`, on the tubes.

```ts
const crossLen = width.subtract(tube.multiply(2));   // fits BETWEEN the rails
const s1 = tubeX(crossLen).translate(tube, endInset, 0).finish('aluminium-brushed');
const sheet = box(width, depth, sheetT).translate(0, 0, tube).finish('aluminium-brushed'); // on the tubes
return union(sheet, front, back, left, right, s1 /* ... */);
```

`evaluate_script` / `kernelcad evaluate` gate every `union()` (errors make `ok: false`):

- `union.disconnected` — the union is more than one solid; the message names the floating operand, its bbox and the gap. Move it until it touches (shared face, zero gap) or add the member that carries it. This applies inside `assembly().part(...)` too: a part that is several floating pieces fails evaluate (the assembly validator's `assembly.mechanical.part-disconnected` is only a warning; it is not a substitute).
- `union.member-overlap` — two operands that each carry their own `.finish()`/`.material()` and the SAME one (two pieces of the same stock) share more than 1 mm³; the message names both, the volume and the overlap box. Most often this is one part finished piece by piece: fuse the same-material pieces first and call `.finish()` once on the result. If they really are separate members, cut one to fit (butt joint) instead of burying it in the other. This applies inside assembly parts too. Operands with DIFFERENT materials may overlap (inlay, over-mould, multi-material part).

Finish once, after the booleans: a boss or rib merged into a body BEFORE `.finish()` has no finish of its own, so ordinary overlapping modelling unions are not affected. Give a piece its own finish only when it is a different material (inlay, over-mould) or a separate member.

- If a model has moving parts, design the joint structure before styling: name the parent/child parts, joint type, axis/frame, limits, and editable pose parameters up front.
- If two parts are intended to touch, author the relationship with connectors and mates rather than relying on raw `translate()` offsets alone. Raw offsets are acceptable for free placement, but touching load-path geometry needs named interfaces the validator and Studio can inspect.
- Prefer `assembly().model()` for multi-part scenes so Studio receives per-part identity, material, mate, and transform metadata. Collapse with `.toCompound()` or `.toUnion()` only when a downstream export truly requires one body.
- For interactive joints, keep heavy CAD recompute as the committed source-of-truth path, but use viewport-side joint posing for drag feedback whenever transform metadata is available. Drag should move the existing part mesh immediately; release commits the parameter for exact recompute, review, and export.
- Final reports for mechanism/gallery work should include an artifact packet: source path, generated artifact paths, deterministic checks run, visual proof path, and unresolved caveats.

## Source and artifact policy

- Source of truth: `.kcad.ts`, task brief/prompt markdown, tests, and explicit provenance metadata that records where dimensions, vendor parts, prompts, and review decisions came from.
- Derived artifacts: rendered PNGs, MP4 demos, STEP, STL, 3MF, DXF, score JSON, generated topology dumps, generated capture-run metadata, and generated route/build outputs.
- Commit derived artifacts only when the repository already treats that directory as an artifact bundle (`docs/demos/**`, `examples/portfolio/**`) or the user explicitly requested a deliverable bundle.
- When committing derived artifacts, keep the source file and provenance beside them and prefer existing capture scripts so hashes/metadata stay reproducible.
- If an artifact changes but source/provenance did not, stop and explain why. Hidden artifact churn is not a valid CAD change.
- Required visual packet: for review-worthy visual work, keep an inspection bundle beside the generated artifact by running `kernelcad render inspect <file> <outDir>`. The v1 bundle writes `manifest.json` and canonical RGB views, with optional `--channels rgb,mask,depth,normals`, `--focus <names>` / `--hide <names>` object filters, `--shading flat`, and `--screenshot-timeout <ms>` recorded in the command/manifest. Depth, normals, and mask channels extend the same packet as richer evidence; they do not replace the canonical RGB views.

## Standard parts and vendor geometry

Use `lib.fromSTEP(...)` for off-the-shelf components whenever physical fit matters:

- Good candidates: motors, servos, bearings, shafts, fasteners, hinges, sensors, PCBs, connectors, rails, and purchased enclosures.
- Store or reference the vendor STEP file deliberately; name the source, version, and license/terms in nearby metadata or README when the file is part of a demo/portfolio bundle.
- Before placing a vendor STEP, run `kernelcad inspect step <file.step>` (or the `inspect({ of: 'step' })` MCP tool) to read the solid tree, per-solid exact bbox + volume, and detected cylindrical holes (axis, diameter, depth, blind/through) — find mounting-hole positions and verify the part-local frame from exact geometry instead of measuring renders.
- Build modeled brackets, mounts, clearances, cable paths, and keepouts around the imported part rather than approximating the part with generic boxes/cylinders.
- Placeholder geometry is acceptable for early blockouts, but final review must label it as a placeholder or replace it with catalog geometry.
- Format choice when the vendor offers several: STEP (`lib.fromSTEP`) is the default and the most portable. Native `.brep` (`lib.fromBREP`) is lossless and the fastest to load. Use it to round-trip kernelCAD geometry. Use STEP to interchange with other CAD systems. Reach for `.stl` (`lib.fromSTL`) only when nothing better exists: it is a triangle mesh, so you keep bbox/volume/booleans but lose analytic surfaces, which means no reliable fillet/chamfer on curved edges, no canonical face refs, and no hole detection. If a mostly prismatic part is STL/OBJ/3MF-only and you need editable geometry (mounting holes, params), run `mesh_to_features` (CLI `kernelcad reconstruct`): it emits a feature-tree script and measures it against the mesh — use it when the verdict is faithful, otherwise model the interface yourself from the reported regions rather than trusting facet normals. Use  when the complete source triangle detail must display quickly: it is a render-only body that supports rigid transforms, assembly placement, color and finish, but no booleans, volume, face queries or solid exports. Conversion to BRep is not automatic.
- For full-detail visualization of large STL assets, use `lib.meshFromSTL(path)`. It avoids BRep sewing and preserves every triangle; the result supports rigid transforms, assembly placement, color and finish, but not booleans, volume, topology queries or solid export.

> For off-the-shelf fasteners, bearings, motors, headers, and connectors, prefer the bundled parts catalog: load the `kernelcad-parts` skill. The catalog exposes `lib.findPart`, `lib.fetchPart`, and a typed `lib.standard.*` namespace, plus four MCP tools for discovery. Bundled parts ship with pre-defined connector frames so they participate in mates without any `partRef.connector(...)` boilerplate.

## Installation

```bash
npm install -g kernelcad
kernelcad evaluate path/to/script.kcad.ts
```

Verify the install with `kernelcad --version` (should print `0.1.0` or higher).
