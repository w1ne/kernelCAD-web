# kernelCAD authoring reference — Verification

Diagnostics and recovery, the verification gate table, and the dfmSpec print-readiness gates.

## When something fails

Every kernel-running tool returns `diagnostics[]`. Each entry has `code`,
`message`, `severity`, optional `feature_id`, and a `hint` — a one-sentence,
imperative recovery instruction. Read the `hint` first; if your feature
failed because an upstream feature failed (`code` is
`recompute.input.missing`), call `why_did_this_fail` to walk the chain
and find the root cause.

The full code catalogue is enumerated by the
`lookup_diagnostics` MCP tool. Call it once at session start if you
want to pre-populate retry strategies.

### Recurring failure classes

These root causes account for most non-converging repairs; fix the cause, not the symptom.

- **No-op booleans** — a `subtract`/`cutout` whose tool never intersects the body reports `feature.subtractive-noop`. Check the tool's coordinates and axis against the body before retrying.
- **Non-finite numeric arguments** — every numeric argument must be a finite number or a numeric `ParamRef`; `NaN`/`undefined` fails capture with `feature.invalid-args`. Derive values with ParamRef methods rather than uninitialized variables.
- **Open or degenerate sketches** — `extrude`/`revolve` need a single closed loop: close the path and remove zero-length segments or duplicate points, or the kernel fails with a sketch-construction error.
- **Undeclared connectors** — declare a connector on the part before referencing it in a mate, and give it a finite `[x, y, z]` origin.
- **Over-tight fillets/chamfers** — keep the radius below half the local wall/edge thickness; larger radii fail in the kernel.
- **Members run into each other or float** — `union.member-overlap` / `union.disconnected` on a frame or tray: cut cross members to `span - 2 * railWidth` and place them at the rail width, keep end members inside the frame, and seat sheets on the tubes (see Multi-member fabrications).
- **ParamRef arithmetic** — never use JS operators on a `param()` result; use `.add/.subtract/.multiply/.divide/.negate` (see the Cookbook entry for worked examples).

## Verification gates

After authoring, run before reporting done:

| Gate | Pass criterion |
|------|----------------|
| G-eval | `kernelcad evaluate <script>` exits 0, zero diagnostics |
| G-return | Script returns a single `Shape` or `Scene` (not undefined, not an array) |
| G-no-overlap | `kernelcad interference <script>` reports zero overlapping volumes |
| G-no-floaters | Every named part appears at the intended position in `kernelcad render` output — nothing hovers in empty space |
| G-conventions | Units mm + degrees, Z-up, all transforms after edge/face features when face-ref names matter |

For visual / reference-driven tasks the gate set extends — see `kernelcad-from-reference`.

## DFM gates (print readiness)

`dfmSpec({...})` declares printability gates in the script; the check engine
enforces them at evaluate time. Three gates ship: **part-pair clearance**
(exact BREP minimum distance), **minimum wall thickness** (inward ray sampling
over the export-grade mesh), and **void/channel topology** (voxel flood-fill:
undeclared sealed voids + channel mouth counting).

```typescript
dfmSpec({
  minWall: 0.8,                       // thinnest wall the DESIGN intends to print
  minClearance: 0.45,                 // fit gap between distinct parts
  includeArticulatedMates: true,      // moving links must also clear at the rest pose
  ignore: [['lid', 'hinge-pin']],     // design-intent contact: clearance-exempt pair
  exclude: ['servo-*', 'pcb'],        // not printed: skips minWall + voids
  channels: [
    { part: 'base', name: 'cable-duct', openings: 2 },               // through-channel
    { part: 'float', name: 'air-pocket', openings: 0, sealed: true },  // intentional sealed void
  ],
});
```

Semantics that matter when authoring the declaration:

- **Opt-in, then always-on.** Scripts without a `dfmSpec` are untouched. Once a
  record is present, EVERY `evaluate` / `evaluate_script` run enforces the
  gates — there is no flag to skip them. A failing gate exits 1 with
  error-severity `dfm.*` diagnostics.
- **Moving mates are opt-in.** By default, all declared mate pairs are exempt
  from the clearance check so seated/fastened interfaces do not create false
  failures. Set `includeArticulatedMates: true` on a mechanism to measure every
  non-fastened mate pair at its declared rest pose. Fastened mates remain
  exempt because their physical contact is checked by the mechanical
  plausibility gate. This is a rest-pose screen, not a swept-motion proof.
- **Malformed declarations THROW at capture** (`feature.invalid-args`
  KernelError) instead of stashing warnings — dfmSpec is an enforcement gate,
  and a silently-disabled gate is worse than a build failure. At least one of
  `minWall` / `minClearance` / `channels` is required; `sealed: true` requires
  `openings: 0` (and vice versa); `exclude` globs are trailing-`*` prefix only.
- **`exclude` and `ignore` are different exemptions.** `exclude` marks parts as
  NOT PRINTED (vendor STEP imports, electronics): they skip minWall and void
  checks but STILL participate in clearance — a vendor part 0.2 mm from a
  printed part is a real assembly problem. `ignore` is a per-PAIR clearance
  exemption for design-intent contacts. Pairs joined by a declared mate are
  clearance-exempt automatically. Overlapping pairs are tagged `interfering`
  and emit the shared `assembly.interference.overlap` error — overlap analysis
  belongs to the interference gate, but the DFM gate never passes over it.
- **Choose `minWall` from the design's intended wall floor**, not a generic
  printer guideline. Declaring `minWall: 1.5` against a design whose thinnest
  intentional wall is 0.8 mm just fails everything and tells you nothing about
  real defects. Also expect near-tangent authoring slivers (a boss grazing a
  rim, a blend tangent to a bore) to surface as sub-0.1 mm wall findings —
  those are honest measurements of sliver geometry; fix the tangency or read
  past them deliberately.
- **Channel detection limits.** ONE non-sealed channel per part — a second
  declaration emits `feature.invalid-args` and the mouth count binds to the
  first. Channels wider than ~16 mm escape the morphological closing and
  report `found: 0` — that is a detection limit, not a blockage. The declared
  channel binds to the LARGEST detected internal component, which can misbind
  on parts with multiple internal voids; the reported `channelSeed` location
  shows which component was picked (binding the declaration by location is a
  recorded follow-up).
- **`'unknown'` clearance status means the measurement FAILED** (kernel error
  on that pair), not that the pair passed. Unknown pairs and kernel-failed
  parts stay warn severity: they surface in the report and the CLI summary
  (`, N unknown`) but never flip the exit code.
- **Diagnostic locations are world-frame.** Every xyz in a `dfm.*` diagnostic
  message is mapped through the part's world transform, so findings compose
  across the parts of a posed assembly. The raw `walls[]` / `voids[]` report
  structs keep part-local coordinates.

Surfaces: automatic on `kernelcad evaluate` / MCP `evaluate_script`; standalone
report via `kernelcad dfm <file>` (`--json`) and MCP `verify({ check: 'dfm' })`.
