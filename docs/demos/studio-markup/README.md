# Studio markup snapshot walkthrough

## Capture command

Run this on a Mac with Chromium available and `/opt/homebrew/bin/ffmpeg` installed:

```sh
npm run capture:studio-markup
```

The repo's Playwright config starts a dedicated Vite server. The two browser
specs replay a snapshot and record the real Studio workflow: open the Bracket
starter, anchor a note, measure two model points, send a prompt with the markup
snapshot, save the JSON, and load it back. The capture spec records WebM, the
command converts it to `demo.mp4`, then removes the intermediate WebM.
The capture spec is skipped in regular Playwright runs and only executes when
the capture command sets `KCAD_CAPTURE=1`.

## Capture evidence

The operator ran `npm run capture:studio-markup` on macOS with real Chromium on
2026-10-20 at about 21:40 CEST, against the worktree immediately before commit
`735d9ee`. Both browser specs passed in 19.1 seconds. The resulting
[`demo.mp4`](demo.mp4) is 279,499 bytes, 1440×900 at 25 fps, and about 11.76
seconds long. I extracted and inspected a frame at 8 seconds: it shows the
Bracket model, the anchored “Keep the mounting face flat” callout, a drawn
“Distance · 9.8 mm” measurement, and picked topology `Face 5 · shape 0` and
`Edge 0 · shape 1`.

This is local browser evidence for the captured revision. It does not verify
later code changes or deployed behavior; no deployment was performed.

This bundle documents the version 1 snapshot fixture and the local Studio
workflow. The feature code and its prompt handoff test are in
[`src/studio/markup`](../../../src/studio/markup),
[`useAgentGeneration`](../../../src/studio/hooks/useAgentGeneration.ts), and
[`StudioGenerate.test.tsx`](../../../src/studio/StudioGenerate.test.tsx).

## Snapshot format and manual replay

Start Studio with `npm run dev`, then open `http://127.0.0.1:5173/studio`.
Choose **Projects → Bracket**, open **Markup**, enter a note and click a point
on the model. Use **Measure** and click two model points. The notes and completed
measurements remain in the Markup panel. **Save JSON** downloads the current
snapshot; **Load JSON** restores its camera and overlays. The replayable example
is [`snapshot-v1.json`](snapshot-v1.json).

The focused local checks and browser tests are:

```sh
npx vitest run --configLoader runner src/studio/markup src/studio/StudioGenerate.test.tsx src/studio/components/viewer/measure/edgePolylines.test.ts src/studio/components/viewer/measure/measureSnap.test.ts src/studio/components/viewer/measure/measureState.test.ts
npx playwright test tests/studio_markup_snapshot.spec.ts --project=chromium
```

`tests/studio_markup_snapshot.spec.ts` uses the existing `playwright.config.ts`
and can be run with the same `--project=chromium` option. The capture command
also runs it before recording the workflow; run `npm run capture:studio-markup`
to include its authenticated local prompt flow and produce the MP4.

`verification.json` separates the operator's local browser capture from the
current local validation. Local results do not establish deployed behavior or
hardware acceptance.

The replayable example is [`snapshot-v1.json`](snapshot-v1.json). The captured
browser recording is [`demo.mp4`](demo.mp4).
