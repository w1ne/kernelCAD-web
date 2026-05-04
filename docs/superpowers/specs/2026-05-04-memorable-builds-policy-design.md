# Memorable builds policy — design

**Date:** 2026-05-04
**Status:** Draft (spec)
**Scope:** Meta-policy binding the per-module visual-demo discipline (§H11) of the v0.2 → v1.0 gap-closure roadmap. Constrains how every per-module brainstorm picks its demo hero artifact through v1.0.
**Supersedes:** Implicit "promo-grade MP4" guidance under gap-closure roadmap §H11.
**Goal:** Replace utilitarian demo defaults (`bracket-holes`, `subtract-then-fillet-rim`-style outputs) with recognizable, scroll-stopping hero artifacts that make the new tool central to the build, doubling as build-in-public assets without extra authoring effort.

## Why this milestone

The v0.21 synchronized live-build pipeline shipped under a roadmap that called for promo-grade demos, but the first artifact that landed (`bracket-holes`) is a generic L-bracket with two through-holes. Generic geometry is the path of least resistance whenever no upstream constraint forces a memorable build. This policy adds that constraint with teeth — at metadata, lint, template, ship-gate, and reviewer-agent layers — so future per-module specs inherit a recognizable shortlist and can't silently default to a primitive.

## Goals (this milestone)

1. Define the bar a demo's hero artifact must clear ("memorable").
2. Pre-commit a 16-artifact catalog (one shortlist per shipping iteration from v0.21 re-shoot through v1.0 capstone).
3. Bind the bar structurally — `meta.json` field, `lint-demos.ts` denylist + catalog match, `whats-new.md` template sections, ship-gate checklist line, reviewer-agent prompt addition.
4. Define the per-module brainstorm protocol that inherits the catalog.
5. Couple the catalog to the @KernelCAD build-in-public daily cadence without adding new posting work.

## Non-goals

- Re-authoring demos for already-shipped iterations other than v0.21. v0.1 (`bracket-with-hole`) and v0.2 (`subtract-then-fillet-rim`) are grandfathered as honest pre-policy content; their legacy fields (gitSha/capturedAt/taskId) are still enforced by `lint-demos.ts`, but they are exempt from the §1 hero-artifact bar and §3 catalog-match requirements. The grandfathered set is encoded in `scripts/lib/memorableBuildsCatalog.ts` as `GRANDFATHERED_VERSIONS`.
- Defining new MCP tools, kernel features, or capture-pipeline behavior — the v0.21 pipeline already produces the artifacts; this spec only governs *what* it captures.
- Style/branding decisions for the rendered output (lighting, materials, color palette) — owned by the v0.21.1+ visual-quality stream.
- Scheduling daily build-in-public posts — this spec only formalizes the natural coupling; cadence is owned by the build-in-public note.

## §1 — The "memorable build" bar

A demo's hero artifact passes if and only if every rule below is true. Rules 1–4 are judgment calls (reviewer-agent enforces). Rule 5 is a scope-discipline anchor for per-module spec authors.

1. **Recognizable in one second.** A non-CAD viewer scrolling past must name the object out loud (donut, mug, guitar pick, octopus). Abstract geometry, brackets, plates, or named primitives fail.
2. **The new tool is central, not garnish.** Removing the iteration's new feature must visibly break the build. Tested by: "if I delete the new tool from the build script, what's left?"
3. **Reads at 360° rotate.** The hero animation is build sequence + rotation. The shape must remain recognizable from every angle the rotation passes through.
4. **Single shot, no labels needed.** The MP4 stands alone without text overlays explaining what the object is. Outside-the-frame post copy is unrelated.
5. **Authored within the iteration's scope budget.** The build script is part of the per-module spec's scope estimate; if it would take more than ~1 day on top of the feature work, the spec picks a simpler shortlist candidate.

## §2 — Catalog (16 hero artifacts, v0.21 + v0.3 → v1.0)

Format: ★ = recommended pick. Each entry names the artifact, asserts the new tool is central, and ties to §1 rule 2. v0.2 (`subtract-then-fillet-rim`) is grandfathered. v0.21 is re-shot under this policy as the launch artifact.

### v0.21 — Synchronized live-build pipeline (re-shoot, replaces `bracket-holes`)

Pipeline is the feature; geometry is the showcase. Target maximum-meme since this re-launches demo discipline.

- ★ **donut** — torus + glaze ring booleaned on top + scattered sprinkles (small extrudes). Iconic 3D-tutorial archetype; reads from any angle; build-step animation is satisfying.
- **apple-core** — revolved profile + boolean cuts for bites.
- **rubber-duck-silhouette** — *deprioritized; wants NURBS, see v0.7.*

### v0.3 — shell + hole + cut + face lineage

- ★ **espresso-cup** — revolve profile, shell to hollow, cut for handle slot, face-ref to fillet rim. Removes shell → solid blob; removes hole → no handle.
- **tiny-pumpkin** — gourd revolve, shell, eye/mouth cuts.
- **watering-can** — revolve + shell + perforation pattern on spout.

### v0.4 — constrained sketches (DISTANCE / ANGLE / TANGENT / SYMMETRIC / CONCENTRIC)

- ★ **guitar-pick** — single closed profile, three tangent arcs, dimensioned. Without tangent + dimension constraints it doesn't read as a pick.
- **house-key-silhouette** — bow + tooth pattern, dimensioned distances, symmetric constraints.
- **heart** — symmetric tangent arcs.

### v0.5 — Studio UI: CADCommand, undo, AST edits, param sliders

Hero must visibly morph live as a slider drags.

- ★ **parametric-mug** — slider drives wall thickness + height + handle radius; same mug morphs in real time. Without sliders it's a static mug.
- **parametric-lego-brick** — slider drives stud count.
- **parametric-phone-case** — sliders for thickness + cutouts.

### v0.6 — Assemblies + joints + connectors + FK

Hero MOVES.

- ★ **articulated-desk-lamp** — base + 3 articulated arms + hinged head; FK demo: head looks around as joints rotate. Without joints it's disconnected parts on the floor.
- **crank-slider-piston** — engineer-meme; satisfying motion.
- **robot-finger** — three phalanges, FK curl.

### v0.7 — NURBS curves

Sweep + loft already shipped (v0.1 bonus); only NURBS curves remain.

- ★ **computer-mouse-shell** — lofted ergonomic top surface using NURBS curves, scroll-wheel slot, button split line. Without NURBS the shell looks like a brick.
- **electric-guitar-body** — lofted top profile + carved cutaways.
- **perfume-bottle** — lofted curves.

### v0.8 — BOM, dimensions, drawings, BREP export

Hero needs a dimensioned drawing + BOM table; the 3D model is incidental.

- ★ **three-leg-stool-with-assembly-diagram** — exploded view + dimensioned drawing + BOM (3× legs, 1× seat, 6× bolts, 6× washers). Without BOM/drawing tools, just a stool.
- **mini-drone-frame** — carbon plate + 4 motor mounts, BOM for fasteners.
- **skateboard-truck** — axle + hanger + baseplate + BOM.

### v0.9 — Toolbox: bolts, nuts, washers, gears, pipes

Hero must use library parts as primary structural elements.

- ★ **mechanical-keyboard-chassis** — toolbox bolts hold case corners, arrayed key switches as toolbox-style modules.
- **warp-pipe** — uses pipe + flange library; high meme value.
- **rube-goldberg-gear-train** — toolbox gears chained, animated rotation (depends on v0.6 FK).

### v0.10 — Viewport: cutPlane, jointsView, explodeView, animation

- ★ **engine-block-exploded-view** — depends on a v0.6 multi-part assembly (pistons + crankshaft + cylinder head); animated explode reveals each part flying out, then cutPlane reveals interior.
- **nesting-doll-cross-section** — cutPlane reveals nested matryoshkas.
- **onion-cross-section** — cutPlane through layers.

### v0.11 finish — CLI render/capture

Hero is the render itself, generated entirely from CLI with no UI.

- ★ **kernelcad-logo-extruded** — self-referential meta-demo.
- **hello-world-3d-text** — extruded letters.
- **engraved-postcard** — "Greetings from kernelCAD" engraved on a 3D postcard.

### v0.12 finish — skill installer + bundler

Meta — the skill installer IS the demo.

- ★ **rubber-duck-skill** — installer pulls a duck-builder skill, runs it, ducks proliferate.
- **self-bundling-build** — a `.kcad.ts` that imports its own helpers from a one-file context bundle.

### v0.13 — Sheet metal: bends, K-factor, flat-pattern

Hero is bent.

- ★ **origami-crane-in-steel** — folded sheet, K-factor exercised on every fold, flat-pattern roundtrip exports the unfolded silhouette.
- **pencil-cup** — rolled cylinder + folded base.
- **letter-holder** — multi-bend mail tray.

### v0.14 — SDF: smooth booleans, TPMS, organic

Hero is squishy or biological.

- ★ **octopus** — body sphere + 8 tentacles smooth-blended via SDF; impossible with hard booleans.
- **gyroid-lattice-cube** — TPMS exhibit.
- **coral-cluster** — organic.

### v0.15 — Wood-specific helpers (mortise / tenon / dado / rabbet)

Hero shows joinery at corners.

- ★ **tiny-wooden-chair** — four legs joined to seat with mortise-and-tenon, stretchers via dado. Joinery visible at every corner.
- **picture-frame** — mitered + rabbet for backing.
- **birdhouse** — rabbet roof joint.

### v0.16 — Vision: image-to-CAD

The input image is half the demo.

- ★ **napkin-sketch-to-3d** — phone-camera shot of a hand-drawn star (or heart, or initials), kernel infers extrude depth, outputs 3D model. The juxtaposition is the post.
- **whiteboard-sketch-to-3d**.
- **photo-of-flat-object-to-3d** — key, gear, etc.

### v0.17 — GCode/CAM: 2.5D toolpaths

Hero must show the toolpath, not just the geometry.

- ★ **engraved-nameplate** — 2.5D pocket toolpath cuts a nameplate; demo shows toolpath visualization sweeping over it.
- **engraved-coaster** — wooden coaster with logo.
- **cookie-cutter-shape** — face-mill demo.

### v1.0 — Capstone (polish + docs + full surface)

Multi-module flex. Must use a meaningful subset of features shipped.

- ★ **mechanical-music-box** — wooden case (v0.15 joinery), brass cylinder with pins (v0.4 sketches + v0.13 sheet for comb), hand-crank gear train (v0.6 joints + v0.9 toolbox gears), shaped wooden lid (v0.7 NURBS surface), assembled with BOM + exploded view (v0.8, v0.10). Plays a 5-second animation when cranked.
- **articulated-robot-arm** — joints + toolbox parts + sheet-metal panels.
- **pinball-machine-table** — sheet metal + wood + assembly + animation.

### Catalog slug rule

Slugs are kebab-case, verb-free, scoped to the iteration version. They serve as the canonical `heroArtifact` value in `meta.json`.

## §3 — Enforcement (six structural touchpoints)

### 3.1 — `docs/demos/README.md` adds a 7th rule

Append to the policy block (under the existing six):

> 7. **Hero artifact must be drawn from the catalog in `docs/superpowers/specs/2026-05-04-memorable-builds-policy-design.md`** (or be a controller-approved override that meets the §1 bar). No catalog-conformant artifact, no `v0.X.0` tag.

### 3.2 — `docs/demos/v0.X/meta.json` schema additions

Add three fields to every iteration's `meta.json`:

```json
{
  "heroArtifact": "<slug from §2 catalog>",
  "catalogSource": "memorable-builds-policy/<iteration version, e.g. v0.3>",
  "overrideApprovedBy": null
}
```

`heroArtifact` MUST equal a §2 slug for that iteration version, OR `overrideApprovedBy` MUST be set to a non-null controller name and a one-line reason.

### 3.3 — `scripts/lint-demos.ts` metadata gate

Add three checks to the existing v0.21 ship-gate lint:

1. **Field presence:** `heroArtifact`, `catalogSource`, `overrideApprovedBy` all present.
2. **Generic-name denylist:** reject `heroArtifact` values matching `box`, `bracket`, `plate`, `cylinder`, `cube`, `sphere`, `torus-only`, or any other named primitive (denylist in lint config, easy to extend).
3. **Catalog match:** `heroArtifact` matches a catalog slug for the iteration's version, unless `overrideApprovedBy` is set.

Lint failure blocks the per-module ship gate, identical to existing v0.21 ship-gate behavior.

### 3.4 — `whats-new.md` template additions

Extend the template body returned by `scripts/lib/whatsNewTemplate.ts` (`whatsNewTemplate()`) with three required sections, and strengthen `whatsNewIsFilled()` in the same module to verify they're filled:

```markdown
## Hero artifact
<Slug from §2 catalog (or override slug)>

## Why memorable (against §1 bar)
- Recognizable in one second: <1 line>
- New tool central: <1 line — what visibly breaks if you remove the new tool?>
- Reads at 360°: <1 line>

## What's new (capability gain)
<Existing template content moves here>
```

Reviewer-agent fails the PR if any of the three new fields is missing, blank, or boilerplate.

### 3.5 — Gap-closure roadmap §H11 update

Replace the existing one-line §H11 reference to "promo-grade MP4" with a pointer to this spec:

> Per-module ship gates require a hero-artifact MP4 + panel + `whats-new.md` per `docs/demos/README.md`. Hero artifact selection is governed by `docs/superpowers/specs/2026-05-04-memorable-builds-policy-design.md` (the catalog binds per-module brainstorms).

### 3.6 — `superpowers:code-reviewer` prompt addition

Add to the reviewer-agent prompt template a one-line clause for `v0.X.0`-tag PRs:

> When the PR ships a `v0.X.0` tag, verify `docs/demos/v0.X/whats-new.md` names a §2 catalog hero artifact (or has a non-null `overrideApprovedBy` in `meta.json`) and that the §1 bar is satisfied by the artifact (not by the prose). If the artifact is generic or the new tool isn't central to it, fail the review and cite this spec.

## §4 — Per-module brainstorm protocol

Future per-module brainstorm dispatches inherit four obligations:

1. **Boilerplate prefix.** Each per-module brainstorm prompt starts with: *"Read `docs/superpowers/specs/2026-05-04-memorable-builds-policy-design.md`. Your iteration's shortlist is in §2 under v0.X. Pick one of {★ / backup / backup}, or propose a 4th meeting §1, with reasoning."*
2. **Mandatory `## Hero artifact` section.** Every per-module spec adds a `## Hero artifact` section that names the locked pick + cites the catalog entry. This section feeds `meta.json` and `whats-new.md`.
3. **Lock-in moment is brainstorm-approval, not implementation.** Build script is part of the spec's scope estimate (per §1 rule 5); iterations can't discover halfway through that the build is too ambitious.
4. **Override path.** If during implementation the chosen artifact turns out infeasible, the implementer escalates to controller — does NOT silently swap for a generic shape. Override is logged in `docs/superpowers/cross-workstream-decisions.md` (existing append-only log) so the precedent is searchable.

## §5 — Build-in-public coupling

The catalog feeds @KernelCAD daily posts naturally — no new posting policy required, but three natural couplings worth recording:

1. **Per-iteration daily post visual.** Each shipped `docs/demos/v0.X/demo.mp4` is the Day-N post visual on @KernelCAD (X) + LinkedIn company page, per the existing build-in-public note.
2. **Pre-iteration shortlist teaser (optional, recommended).** Before each iteration ships, the §2 shortlist itself becomes content: *"v0.3 next — picking between espresso cup, tiny pumpkin, watering can. What should I build?"* Crowd-sources taste-testing and surfaces weak candidates.
3. **Catalog-reveal post (one-time, on this spec's commit).** A single thread/post unveils the full 16-build roadmap as a build-in-public teaser, setting narrative for the sprint.

## Architecture & components

This spec is a meta-policy, not a code change. Components added:

| Touchpoint | File / location | Owner |
|---|---|---|
| Policy spec | `docs/superpowers/specs/2026-05-04-memorable-builds-policy-design.md` | this doc |
| Catalog (the 16 shortlists) | §2 of this doc | this doc |
| 7th demo rule | `docs/demos/README.md` | follow-up plan |
| `meta.json` schema | `docs/demos/v0.X/meta.json` (per iteration) | follow-up plan |
| Lint gate | `scripts/lint-demos.ts` | follow-up plan |
| `whats-new.md` template | `scripts/lib/whatsNewTemplate.ts` | follow-up plan |
| Roadmap §H11 update | gap-closure roadmap design doc | follow-up plan |
| Reviewer-agent prompt update | reviewer-agent definition | follow-up plan |
| Per-module brainstorm protocol | inherited by all v0.3 → v1.0 specs | follow-up plan |

## Data flow

1. Per-module brainstorm reads §2 catalog → selects hero artifact slug.
2. Per-module spec records `## Hero artifact: <slug>`.
3. Implementation captures demo via v0.21 pipeline → `docs/demos/v0.X/{demo.mp4, panel.png, hero-frame.png, meta.json, pacing.json, whats-new.md}`.
4. `lint-demos.ts` validates `meta.json.heroArtifact` against §2 catalog (or override).
5. `whats-new.md` validation enforces three required sections.
6. Reviewer-agent on the `v0.X.0`-tag PR confirms §1 bar satisfied by the artifact, not the prose.
7. On merge, `demo.mp4` becomes the Day-N build-in-public post visual.

## Error handling

- **Lint rejects unknown `heroArtifact` slug:** implementer either picks a §2 candidate or sets `overrideApprovedBy` after controller approval.
- **Reviewer-agent rejects "memorable" judgment:** PR blocked; spec author re-picks from §2 or escalates to controller.
- **Override approved mid-implementation:** logged in `cross-workstream-decisions.md` with date + reason. No silent fallback to a primitive.

## Testing

This is a doc + lint + template change. Test coverage:

- **Lint test (`tests/lint-demos.spec.ts`):** add cases for (a) valid catalog slug, (b) generic denylist hit, (c) missing fields, (d) override path with `overrideApprovedBy` set.
- **Template test:** snapshot the new `whats-new.md` template; assert reviewer-agent prompt loader picks up the new clause.
- **Catalog roundtrip:** integration test that walks every §2 entry slug and confirms it's reachable from at least one iteration's expected `heroArtifact` set.

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Catalog picks turn out infeasible at implementation time | Medium | Per §4.3, build script is part of spec's scope estimate; per §4.4, override path with paper trail. |
| "Memorable" judgment is subjective; reviewer-agent calls it inconsistently | Medium | §1 rules 1–4 are concrete tests; rule 2 is mechanical ("delete the new tool, what's left?"). Reviewer prompt cites this spec. |
| Pre-iteration teaser posts (§5.2) fail to engage and become noise | Low | §5.2 is recommended-not-required; can drop without policy change. |
| Catalog locks us out of better artifacts that emerge later | Low | "We can improve it later" — catalog is editable as a normal spec amendment; not a frozen contract. |
| Generic-name denylist (§3.3.2) blocks a legitimately memorable build that happens to match a primitive name | Very low | Override path covers it; denylist also extensible in lint config. |

## Open questions

None at design time. Catalog content is committed; refinements happen via amendment.
