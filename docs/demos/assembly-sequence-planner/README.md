# Assembly sequence planner (P1 stage B)

The `demo.mp4` is an annotated still sequence built from local
`kernelcad render --preset publish` captures of
`examples/assemblies/assembly-sequence-gearbox.kcad.ts` and the planner's
actual JSON result. It is not a screen recording, turntable, deployed-platform
capture or hardware test.

What it shows:

- the twelve-part gearbox blockout, its internals and an exploded view;
- two fastened-mate subassemblies (each shaft with its two gears), planned
  recursively inside and installed as one unit at the top level;
- the `sequence: true` result: fourteen 1-indexed steps (twelve part additions
  plus two subassembly installs), each with its insertion direction;
- the never-collapsed states (`removable`, `blocked`, `unknown`) and the
  sampling labels (`found-by-search`, never proven; `unknown: budget`);
- the model stamp (rigid parts, straight-line translation, six tested
  directions, no gravity, mesh tessellation and zero-clearance policy).

Reproduce from the repository root:

```sh
npx tsx src/agent/cli/index.ts render examples/assemblies/assembly-sequence-gearbox.kcad.ts --preset publish -o docs/demos/assembly-sequence-planner/gearbox-assembled.png
npx tsx src/agent/cli/index.ts render examples/assemblies/assembly-sequence-gearbox.kcad.ts --preset publish --hide cover -o docs/demos/assembly-sequence-planner/gearbox-internals.png
npx tsx src/agent/cli/index.ts render examples/assemblies/assembly-sequence-gearbox.kcad.ts --preset publish --explode 0.6 -o docs/demos/assembly-sequence-planner/gearbox-exploded.png
node docs/demos/assembly-sequence-planner/make-video.mjs
```

`make-video.mjs` uses `FFMPEG` when set, otherwise `ffmpeg` from `PATH`. The
host used for this bundle had no system ffmpeg, so the video was encoded with
the static binary from the `ffmpeg-static` npm package; this is an environment
detail, not part of the kernelCAD API.

Evidence:

- `sequence-evidence.json` — exact `verify({ check: 'assembly-path', sequence: true })`
  result for the example: source hash, model stamp, per-part state, all
  fourteen steps, subassembly tags, `unknown`, `search` and `stuckParts`.
- `video-evidence.json` — input image hashes, delivered video hash, slide
  durations, exact render/plan invocations and provenance.
- `frames/` — the exact slides the encoder consumed.

The planner is local triangle-mesh evidence. It assumes rigid parts,
straight-line translation along the tested directions, no gravity (P3 has not
run), the export mesher's tessellation and zero clearance. Subassembly and
multi-part moves are heuristics, not exhaustive; a sampling result is found
inside a finite budget, not a proof. It proves neither hardware assembly nor
strength. Catalog screw/bolt/nut families are `unknown: non-straight-path`
until P2 models helical removal.
