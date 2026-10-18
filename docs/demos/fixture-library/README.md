# Machining-fixture library (`lib.fixture`)

The 18-second `demo.mp4` is an annotated still sequence composed from local
`kernelcad render --preset publish` captures of the committed example. It is
not a screen recording, turntable, deployed-platform capture, physical setup
or machining test.

Source: `examples/fixture/table-clamp-set.kcad.ts` — a 400 × 130 × 24 mm
T-slot table section with a 12 mm channel, a 50 × 70 × 36 mm workpiece and two
M10 clamp sets. Every hardware part comes from `lib.fixture`: T-slot nut in
the channel, clamping stud, strap clamp over the workpiece, step block under
the tail, flange nut on top.

Reproduce from the repository root:

```sh
npx tsx examples/fixture/verify-fixture.mts
npx tsx src/agent/cli/index.ts render examples/fixture/table-clamp-set.kcad.ts --preset publish --pose 55,42 -o docs/demos/fixture-library/fixture.hero.png
convert docs/demos/fixture-library/fixture.hero.png -crop 760x660+700+360 +repage docs/demos/fixture-library/fixture-detail.png
python3 docs/demos/fixture-library/make-review-video.py
```

Evidence:

- `geometry-evidence.json` — source hash, 66 part pairs checked with zero
  positive-volume overlaps, the spans that document each mating face (T-nut
  wing tops at 14.4 mm, clamp underside level with the 36 mm workpiece top at
  60 mm, flange nut at 72–82 mm), and the scope statement.
- `video-evidence.json` — input image hashes, delivered video hash, slide
  durations and the exact render invocations.
- `viewer-evidence.json` — the GLB the inline viewers consume (12 named
  parts, one material per part) exported through the same CLI path as the
  hosted `export` tool.

## Hosted apps (Claude, ChatGPT, Studio)

`lib.fixture` needs no filesystem: each call resolves the catalog id and
falls back to the in-memory envelope, with a STEP loaded when the catalog is
on disk. `src/modeling/runtime/browserRuntime.test.ts` covers the
browser-shaped runtime without a host filesystem, the same runtime the
hosted `evaluate_script` path uses, including the refusal of an unstocked
stud length. `viewer-evidence.json` records the GLB payload for the inline
viewer. The parts skill teaches Claude and ChatGPT agents the five calls and
their connectors.

Scope: nominal envelope solids from the stock table (slot/thread pairing
follows common machine-table practice; check the supplier drawing before
ordering). The example proves placement and stock dimensions, not clamping
force, torque, stud deflection, fixture stiffness or machining loads. Digital
assembly only; no physical setup was built or cut.

Feature tests: `src/modeling/parts/fixtureSolids.test.ts` covers each
envelope's bounding dimensions and `src/modeling/parts/familyTable.test.ts`
covers ids, dims and connector frames; `tests/integration/lib-parts.test.ts`
covers `lib.part` and `lib.fixture` resolving the same catalog ids.
