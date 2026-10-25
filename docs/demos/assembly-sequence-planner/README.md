# Fastener precedence and tool reach (P2)

The `demo.mp4` is an annotated still sequence built from local
`kernelcad render --preset publish` captures of
`examples/assemblies/assembly-sequence-gearbox.kcad.ts` and the planner's
actual JSON result. It is not a screen recording, turntable, deployed-platform
capture or hardware test.

What it shows:

- the gearbox blockout with four bolts, a press-fit gear and a rib beside one
  bolt head;
- all four bolts planned as `motion: 'helical'` with a declared 0.7 mm pitch;
- `bolt-a` retaining its helical removal while its modelled driver envelope is
  `tool-blocked`, naming `tool-clearance-rib`;
- the press-fit gear planned as a `requires-force` step, never simulated;
- the two fastened-mate subassemblies, the model stamp
  (`motionModels` includes `helical-screw` and `requires-force`,
  `toolReach: swept-envelope`) and the S2 ledger entries (`assembly.toolReach.*`
  pass/fail, `assembly.requiresForce.*` not-evaluated).

Reproduce from the repository root:

```sh
npm run build:player
npx tsx src/agent/cli/index.ts render examples/assemblies/assembly-sequence-gearbox.kcad.ts --preset publish -o docs/demos/assembly-sequence-planner/gearbox-assembled.png
npx tsx src/agent/cli/index.ts render examples/assemblies/assembly-sequence-gearbox.kcad.ts --preset publish --hide cover -o docs/demos/assembly-sequence-planner/gearbox-internals.png
npx tsx src/agent/cli/index.ts render examples/assemblies/assembly-sequence-gearbox.kcad.ts --preset publish --explode 0.6 -o docs/demos/assembly-sequence-planner/gearbox-exploded.png
node docs/demos/assembly-sequence-planner/make-video.mjs
```

`make-video.mjs` uses `FFMPEG` when set, otherwise `ffmpeg` from `PATH`. This
host has no system ffmpeg/ffprobe; the MP4 was encoded with the static binary
from `/tmp/opencode/node_modules/ffmpeg-static/ffmpeg` and a frame was extracted
and visually inspected. `npm run lint-demos` therefore cannot run here; report
that as an environment failure, not a skipped verification.

Evidence:

- `sequence-evidence.json` — exact `verify({ check: 'assembly-path', sequence: true })`
  result for the example: source hash, model stamp, per-part state, all
  nineteen steps, fastener motion, tool findings, `requiresForce`,
  `toolBlocked`, `unknown`, `search`, `stuckParts` and the S2 ledger.
- `video-evidence.json` — input image hashes, delivered video hash, slide
  durations, exact render/plan invocations and provenance.
- `frames/` — the exact slides the encoder consumed.

The planner is local triangle-mesh evidence. It assumes rigid parts,
straight-line translation plus declared helical fastener motion, no gravity
(P3 has not run), the export mesher's tessellation and zero clearance.
Helical motion records rotation but does not model thread engagement, torque or
preload. Tool reach is a swept cylinder/cone envelope, not a driver drawing.
Press and snap fits are declared `requires-force`, never simulated or proven;
`ok` stays false for them. Subassembly and multi-part moves are heuristics, not
exhaustive; a sampling result is found inside a finite budget, not a proof.
The example proves neither hardware assembly nor strength.
