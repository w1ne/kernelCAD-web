# Assembly sequence planner core (P1 stage A)

The 41-second `demo.mp4` is an annotated still sequence built from local
`kernelcad render --preset publish` captures of
`examples/assemblies/assembly-sequence-gearbox.kcad.ts` and the planner's
actual JSON result. It is not a screen recording, turntable, deployed-platform
capture or hardware test.

What it shows:

- the twelve-part gearbox blockout, its internals and an exploded view;
- the `sequence: true` result: twelve 1-indexed build steps, each with the
  insertion direction (the reverse of the proven removal direction);
- the three never-collapsed states (`removable`, `blocked`, `unknown`);
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
  result for the example: source hash, model stamp, per-part state, all twelve
  steps, `unknown` and `stuckParts`.
- `video-evidence.json` — input image hashes, delivered video hash, slide
  durations, exact render/plan invocations and provenance.
- `frames/` — the exact slides the encoder consumed.

The planner is local triangle-mesh evidence. It assumes rigid parts,
straight-line translation along the tested directions, no gravity (P3 has not
run), the export mesher's tessellation and zero clearance. It proves neither
hardware assembly nor strength. Catalog screw/bolt/nut families are
`unknown: non-straight-path` until P2 models helical removal; stage B adds
subassemblies, ordering heuristics and the non-straight-path search fallback.
