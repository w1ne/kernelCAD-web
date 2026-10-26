# Approximate static stability (P3)

The `demo.mp4` is an annotated still sequence built from local
`kernelcad render --preset publish` captures of
`examples/assemblies/assembly-stability-bracket.kcad.ts` and the real P3
verifier result. It is not a screen recording, turntable, deployed-platform
capture, physics simulation or hardware test.

What it shows:

- a base with a left pedestal, lower shelf and tall post, plus a cantilever and
  a narrow free-end support;
- the planner's outside-in peel builds the cantilever (step 1) before the
  support (step 3), while the base is the inferred seed/fixture from step 1;
- step 1 is `needs-hold`: the cantilever's centre of mass projects outside the
  support polygon of its pedestal contact (`base`);
- step 3 is `stable` with `heldBy: ['base']`;
- the model stamp: `gravity: 'approximate-support-projection'`,
  `stability.model: 'approximate-support-projection'`, contact tolerance,
  seed/seed source and mass basis.

Reproduce from the repository root:

```sh
npm run build:player
npx tsx src/agent/cli/index.ts render examples/assemblies/assembly-stability-bracket.kcad.ts --preset publish -o docs/demos/assembly-stability-p3/bracket-assembled.png
npx tsx src/agent/cli/index.ts render examples/assemblies/assembly-stability-bracket.kcad.ts --preset publish --explode 0.8 -o docs/demos/assembly-stability-p3/bracket-exploded.png
npx tsx docs/demos/assembly-stability-p3/make-evidence.ts
node docs/demos/assembly-stability-p3/make-video.mjs
```

`make-video.mjs` uses `FFMPEG` when set, otherwise `ffmpeg` from `PATH`.
This host had ffmpeg/ffprobe available; the MP4 was encoded and a frame was
extracted and visually inspected.

Evidence:

- `stability-evidence.json` — exact
  `verify({ check: 'assembly-path', sequence: true, stability: true })` result
  for the example: source hash, model stamp, steps, `needsHold`, `unknown` and
  limitations.
- `video-evidence.json` — input image hashes, delivered video hash, slide
  durations, exact render/plan invocations and provenance.
- `frames/` — the exact slides the encoder consumed.

The check is **approximate**. It projects each part's closed-mesh volume centroid under a uniform-density
assumption onto the convex hull of mesh contacts with already-stable parts
under a declared gravity direction. It does
not integrate gravity, model friction or tipping, solve fixtures, or measure
compliance. A `needs-hold` finding says the model cannot prove support; it does
not prove the part will fall. Contact sampling uses mesh vertices and triangle
centroids, so a contact patch smaller than the tessellation can be missed.
