# Standard parts library (`lib.part` / `lib.stack`)

The 23-second `demo.mp4` is an annotated still sequence composed from local
`kernelcad render --preset publish` captures of the two committed examples. It
is not a screen recording, turntable, deployed-platform capture or hardware
test.

Sources:

- `examples/parts/fastener-lineup.kcad.ts` — one envelope per family: ISO 4762,
  ISO 7380, ISO 10642 screws; ISO 4032, DIN 985 nuts; ISO 7089, DIN 127B
  washers.
- `examples/parts/bolt-stack.kcad.ts` — two 6 mm bars in a lap joint, one M5
  bolt-mode stack; a 12 mm grip picks the M5 × 25 screw (two pitches past
  the nut).
- `examples/parts/catalog-lineup.kcad.ts` — the current catalog on a display
  base: hex head bolt, socket head, countersunk, button head and set screw,
  hex and lock nuts, the two washers and an M8 × 250 threaded rod.
- `examples/parts/bolted-flange.kcad.ts` — a flange ring, eight Ø6.6 bores on
  an 85 mm bolt circle. `lib.insert` sizes them to M6 normal (ISO 273), cuts
  the 90° countersink each flat head needs and places eight M6 × 20 stacks
  (screw, tail washer, nut). The 23-second `flange-demo.mp4` is the annotated
  still sequence for this example.

Reproduce from the repository root:

```sh
npx tsx examples/parts/verify.mts
npx tsx src/agent/cli/index.ts render examples/parts/fastener-lineup.kcad.ts --preset publish -o docs/demos/standard-parts/lineup.hero.png
npx tsx src/agent/cli/index.ts render examples/parts/bolt-stack.kcad.ts --preset publish -o docs/demos/standard-parts/stack.hero.png
npx tsx src/agent/cli/index.ts render examples/parts/bolt-stack.kcad.ts --preset publish --width 2048 --height 1536 --pose 0,0 -o docs/demos/standard-parts/stack-front.png
convert docs/demos/standard-parts/stack-front.pose-0-0.png -crop 1400x1100+330+210 +repage docs/demos/standard-parts/stack-detail.png
python3 docs/demos/standard-parts/make-review-video.py
npx tsx examples/parts/verify-flange.mts
npx tsx src/agent/cli/index.ts render examples/parts/bolted-flange.kcad.ts --preset publish -o docs/demos/standard-parts/flange.hero.png
npx tsx src/agent/cli/index.ts render examples/parts/bolted-flange.kcad.ts --preset publish --width 2048 --height 1536 --pose 0,0 -o docs/demos/standard-parts/flange-front.png
convert docs/demos/standard-parts/flange-front.pose-0-0.png -crop 900x430+660+590 +repage docs/demos/standard-parts/flange-detail.png
python3 docs/demos/standard-parts/make-flange-video.py
npx tsx examples/parts/verify-catalog.mts
npx tsx src/agent/cli/index.ts render examples/parts/catalog-lineup.kcad.ts --preset publish -o docs/demos/standard-parts/catalog.hero.png
convert docs/demos/standard-parts/catalog.hero.png -crop 760x480+330+300 +repage docs/demos/standard-parts/catalog-detail.png
```

Evidence:

- `geometry-evidence.json` — source hashes, per-part bounds and volumes,
  pairwise interference (0 positive-volume overlaps in both examples), grip
  and screw-length rule, and the scope statement.
- `video-evidence.json` — input image hashes, delivered video hash, slide
  durations and the exact render invocations (the original demo).
- `flange-evidence.json` — the flange example's source hash, per-part bounds
  and volumes, 300 pairwise checks (zero positive-volume overlaps), the cut
  countersink volume (1305 mm³ for eight seats) and the M6 normal sizing.
- `flange-video-evidence.json` — the `flange-demo.mp4` inputs, hash, slide
  durations and invocations.
- `catalog-evidence.json` — the current-catalog lineup: source hash, parts,
  spans, 55 pairs with zero positive-volume overlaps and the family list.
- `inspect/manifest.json` and `inspect/channels/rgb/` — deterministic
  `kernelcad render inspect` bundle for `bolt-stack.kcad.ts`.
- `src/modeling/runtime/browserRuntime.test.ts` covers the browser path
  ("lib.part builds an envelope without a filesystem").

Scope: the evidence JSON files, `demo.mp4`, `flange-demo.mp4` and the `*.hero.png`
stills predate modeled threads and show envelope solids (head plus shank, no
helical thread). Since 2026-10-24 `lib.part` defaults to `detail: 'full'`
(sockets, chamfers, ISO 68-1 threads); the guide's images in
`docs/guide/standard-parts-library/` are renders of that geometry, and
`fastener-lineup.kcad.ts` pins `detail: 'envelope'` so its video still matches.
Fit and clash checks measure the envelope at either detail. No thread contact,
strength, torque or preload. The committed catalog STEPs hold the envelope
detail and come from the same builder as the in-memory solids. Digital
geometry and placement only; no physical hardware was fabricated or measured.
The `frames/` directory holds the exact slides the encoder consumed (the
flange video uses `flange-frames/`). The guide page is
`docs/guide/standard-parts-library.md` (draft; the three feature guides were
unpublished on 2026-10-19 for one reworked post). The fastener table now
covers M2–M20 (family ranges vary), and `lib.insert` matches all three ISO 273 fit classes
(close/normal/loose), reporting the match per hole.
