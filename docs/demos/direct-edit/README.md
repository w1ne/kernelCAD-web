# Direct edit: drag to clearance

The first end-to-end direct-edit demo. A two-part assembly ships in a genuinely
broken pose — the slider is buried 2 mm into the base (one interference pair,
~800 mm³) — and a single +30 mm X drag on the slider rewrites its source,
clears the clash, and stages a reviewable diff:

```
interferences: 1  →  0
```

No file is written until the staged edit is accepted; accepting the diff is the
same `/__kernelcad/source` PUT that the studio save-back path uses.

## Hero model

`examples/direct-edit-drag-to-clearance.kcad.ts`

```ts
const PX = param('PX', 20, { min: 0, max: 60 });
const PYZ = param('PYZ', 6, { min: 4, max: 12 });

const demo = assembly('direct-edit drag to clearance');
demo.part('base', box(60, 40, 6, true));
demo.part('slider', box(20, 20, 10, true).translate(PX, 0, PYZ));

return demo.model();
```

Both boxes are centered on their local frame. The slider spans z ∈ [1, 11] and
the base z ∈ [-3, 3], so the pair really interpenetrates by 20 × 20 × 2 =
800 mm³ at the default PX = 20. Moving the slider +30 mm in X puts it at
x ∈ [40, 60], fully clear of the base's x ∈ [-30, 30].

## What the drag actually plans

For this shape the planner resolves the slider's `.translate(PX, 0, PYZ)`
per-axis as `X:param · Y:literal · Z:param` and rewrites the `PX` declaration
**in place**. It does not append a `.translate(30, 0, 0)` wrapper. The accepted
diff is exactly one line:

```diff
-const PX = param('PX', 20, { min: 0, max: 60 });
+const PX = param('PX', 50, { min: 0, max: 60 });
```

The candidate review reports `evaluation.ok: true` with the validity movement
`interferences 1 → 0`, `Σ volume 800.0 → 0.0 mm³`. The `+30` delta is what an
agent-facing MCP `transform_entity` tool will propose in slice 1b — same
planner, same spec, same staged-edit payload.

## Evidence

`before/` is the shipped (interpenetrating) pose, `after/` is the pose after
the accepted `PX = 50` edit. Both are `kernelcad render inspect` bundles
(`manifest.json` + canonical `channels/rgb/{front,right,top,iso}.png`).
Manifest bounds move from `max.x = 30` (slider touching the base's face) to
`max.x = 60` (slider clear).

Visible difference in the RGB views:

- **before/front.png** — the slider (right block) visibly sinks into the base
  plate's top face; the plate/slider junction has no air gap. The render's
  mechanism watermark lists `mechanism.interpenetration` alongside
  `mechanism.orphan-part`.
- **after/front.png** — the slider is up and to the right with a clear air gap
  from the plate; `mechanism.interpenetration` is gone from the watermark.
- **iso** views show the same: embedded block vs. a free-standing block beside
  the plate.

The remaining `mechanism.orphan-part` watermark in both bundles is inherent to
this minimal two-part model — it has no joints or mates by design, so the parts
are "orphaned" from any mechanism graph. It is not a regression from the edit.

Reproduce the bundles:

```bash
npx tsx src/agent/cli/index.ts render inspect \
  examples/direct-edit-drag-to-clearance.kcad.ts docs/demos/direct-edit/before
# apply the accepted PX = 50 source, then:
npx tsx src/agent/cli/index.ts render inspect \
  examples/direct-edit-drag-to-clearance.kcad.ts docs/demos/direct-edit/after
```

## E2E

`tests/e2e/direct-edit-drag.spec.ts` drives the DEV hook
(`window.__kernelcad_drag_entity({ anchor: { kind: 'part', name: 'slider' },
delta: [30, 0, 0] })`), asserts the staged `toCode` rewrite, exactly one review
POST, the 1 → 0 validity delta, and that the example on disk is byte-identical
until accept. Accept is performed through the same `/__kernelcad/source` PUT
the UI's Accept button issues, then the page reloads and the HUD reads
`interferences: 0`. The spec restores the original source in a `finally` and
asserts its sha256, so a failed run never leaves the repo dirty.

```bash
npm run test:e2e -- tests/e2e/direct-edit-drag.spec.ts
```

Note on the accept click: the staged-edit card (`staged-edit-approve`) lives in
AgentRail, which StudioShell mounts only with configured Supabase auth and a
live session. This suite runs against the plain unauthenticated dev server, and
there is no precedent in `tests/e2e/` for seeding a signed-in session without
real test-user credentials (`connectClaudeDesktop.spec.ts` skips that branch).
The spec therefore drives acceptance through the hook's returned `StagedEdit`
plus the save endpoint; the button wiring itself is unit-covered in
`StagedEditSlot.test.tsx`.
