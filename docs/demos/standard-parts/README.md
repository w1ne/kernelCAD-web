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
  bolt-mode stack; a 12 mm grip picks the M5 × 18 screw.

Reproduce from the repository root:

```sh
npx tsx examples/parts/verify.mts
npx tsx src/agent/cli/index.ts render examples/parts/fastener-lineup.kcad.ts --preset publish -o docs/demos/standard-parts/lineup.hero.png
npx tsx src/agent/cli/index.ts render examples/parts/bolt-stack.kcad.ts --preset publish -o docs/demos/standard-parts/stack.hero.png
npx tsx src/agent/cli/index.ts render examples/parts/bolt-stack.kcad.ts --preset publish --width 2048 --height 1536 --pose 0,0 -o docs/demos/standard-parts/stack-front.png
convert docs/demos/standard-parts/stack-front.pose-0-0.png -crop 1400x1100+330+210 +repage docs/demos/standard-parts/stack-detail.png
python3 docs/demos/standard-parts/make-review-video.py
```

Evidence:

- `geometry-evidence.json` — source hashes, per-part bounds and volumes,
  pairwise interference (0 positive-volume overlaps in both examples), grip
  and screw-length rule, and the scope statement.
- `video-evidence.json` — input image hashes, delivered video hash, slide
  durations and the exact render invocations.
- `inspect/manifest.json` and `inspect/channels/rgb/` — deterministic
  `kernelcad render inspect` bundle for `bolt-stack.kcad.ts`.
- `src/modeling/runtime/browserRuntime.test.ts` covers the browser path
  ("lib.part builds an envelope without a filesystem").

Scope: envelope solids only (head plus shank; no helical thread), no thread
contact, strength, torque or preload. The committed catalog STEPs are exported
from the same family table, so the on-disk and in-memory paths agree. Digital
geometry and placement only; no physical hardware was fabricated or measured.
The `frames/` directory holds the exact slides the encoder consumed. The guide
page is `docs/guide/standard-parts-library.md` (draft).
