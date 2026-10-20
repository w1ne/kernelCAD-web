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

`verification.json` records the checks run for this working tree. Local
validation does not establish deployed behavior or hardware acceptance.

The replayable example is [`snapshot-v1.json`](snapshot-v1.json). After running
the capture command, inspect the browser recording at [`demo.mp4`](demo.mp4)
before handoff.
