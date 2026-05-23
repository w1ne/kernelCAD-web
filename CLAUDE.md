# Repo conventions for Claude Code agents working in kernelCAD-web

## CAD authoring discipline

For any task that creates or modifies CAD output, use the bundled
`kernelcad` skill first and load `kernelcad-authoring` before editing a
`.kcad.ts` model. The source file is the design source of truth; generated
PNG/MP4/STEP/STL/score artifacts are evidence or deliverables, not files to
hand-edit.

Adopt this loop:

1. Classify the job and write down the engineering intent before coding.
2. Plan the `.kcad.ts` source, parameters, imports, explicit output artifacts,
   and verification commands.
3. Edit source and provenance only.
4. Generate named targets only; do not refresh whole artifact directories unless
   the task is explicitly a release/demo rebuild.
5. Validate with deterministic commands before relying on screenshots.
6. If a rendered artifact is produced, inspect it visually and report concrete
   visible evidence. Do not mark visually broken CAD done because tests passed.
7. When visual evidence matters, run `kernelcad render inspect <file> <outDir>`
   to produce a deterministic inspection bundle with a manifest and canonical
   RGB views. Add `--channels rgb,mask,depth,normals` when machine-readable
   object masks, depth, or view-space normals are needed. Use `--focus <names>`
   or `--hide <names>` to isolate feature ids or assembly part names when
   clutter would obscure the check. Keep richer channels in the same manifest
   packet; do not replace the canonical RGB views.

Prefer `lib.fromSTEP(...)` for real purchased components such as servos,
bearings, motors, fasteners, sensors, PCBs, and connectors. Hand-modeled
placeholder boxes/cylinders are acceptable for blockouts, but final review must
either replace them with vendor/catalog geometry or label the limitation.

## Demo discipline (v0.X.0-tag PR review rule)

When reviewing a PR that ships a `v0.X.0` tag (cuts a per-module release):

1. Verify `docs/demos/v0.X/<task>/whats-new.md` contains a `## Hero artifact` section, a `## Why memorable` section with all three bullets filled (no `TODO:`), and a `## What's new` section.
2. Verify `docs/demos/v0.X/<task>/meta.json` contains `heroArtifact`, `catalogSource`, and `overrideApprovedBy` keys.
3. Verify the §1 bar of the memorable-builds policy spec (in kernelCAD-private) is satisfied by the *artifact itself*, not by the prose. If `heroArtifact` is generic (box, bracket, plate, etc.) or the new tool isn't visibly central to the build, fail the review and cite the policy spec.
4. If `meta.json.overrideApprovedBy` is non-null, the override path was used. Surface this to the controller for traceability — it is not automatically a fail, but should not be a default.

This rule binds the `superpowers:code-reviewer` agent and any human reviewer working in this repo.
