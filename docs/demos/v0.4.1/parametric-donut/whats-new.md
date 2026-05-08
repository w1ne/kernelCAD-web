# v0.4.1 — parametric authoring closure

## Hero artifact

Parametric donut (`examples/v0.21/donut.kcad.ts`): body and glaze rings revolved from a path-builder profile and filleted; sprinkles scattered on top. Every editable dimension is declared with `param()` and any derived dimension (glaze inner/outer radii, sprinkle Z) composes through `ParamRef` arithmetic. Editing any param via `params.update` re-lowers the chain and the donut tracks the edit live.

## Why memorable

- Recognizable in one second: the silhouette reads as a doughnut — torus body with a smaller drip ring on top, rounded edges throughout, sprinkles scattered around the glaze.
- New tool central: every marquee feature this release ships exercises in this build — `ParamRef.add/.subtract/.multiply/.divide`, `path()...close().revolve()` with ParamRef coords, fillet-on-revolved, `.translate(x, y, z)` accepting ParamRef. None of the geometry would lower before this release.
- Reads at 360°: the rotationally symmetric body and glaze stay legible from every angle, and the sprinkle Cartesian positions break the radial monotony so the rotate phase isn't featureless.

## What's new

This release closes the parametric authoring arc. Every editable dimensional argument on the public agent surface — primitive sizes, sketch coords, transform components, derived expressions — now accepts `ParamRef<number>`. The five capability slices that compose this release:

- **`ParamRef.add` / `.subtract` / `.multiply` / `.divide` / `.negate`** ([#110](https://github.com/w1ne/kernelCAD-web/pull/110)): symbolic arithmetic on parametric handles via a small AST. Closes the gap where `screwSpacingX / 2` silently coerced to `NaN`.
- **`cylinder().fillet(r)` and revolved-shape fillets work** ([#109](https://github.com/w1ne/kernelCAD-web/pull/109)): three-part wrapper fix around replicad's `Face.normalAt` U-seam throw. Bumps replicad 0.20.5 → 0.23.1.
- **`PathBuilder` accepts `Editable<number>`** ([#112](https://github.com/w1ne/kernelCAD-web/pull/112)): every `moveTo` / `lineTo` / `tangentArc` / `threePointsArc` / `sagittaArc` / `bulgeArc` / `radiusArc` coord/scalar takes a `ParamRef`. Demotes `revolveRect` (no unique capability over `path()...close().revolve()`).
- **`Shape.translate` and `Shape.rotate` accept `Editable<number>`** ([#113](https://github.com/w1ne/kernelCAD-web/pull/113)): every coordinate / axis component / angle / pivot takes a `ParamRef`. Plus `CaptureSession.appendTransform` correctly propagates ParamRefs into the dependency index for `params.update` reactivity.
- **Diagnostic vocabulary collapse — milestone C** (earlier): ~80 codes → 24, mandatory `hint` field, `why_did_this_fail` reshaped to upstream-walk only, new `list_diagnostic_codes` MCP tool.

Plus the donut hero artifact rewritten in two passes (#111, #112, #113) to demonstrate the surface end-to-end.

> **Note:** A captured `demo.mp4` for this artifact is forthcoming via the v0.21 synchronized live-build pipeline. Reproduce the build locally with `npx tsx src/cli/index.ts evaluate examples/v0.21/donut.kcad.ts` (15 features, OK).
