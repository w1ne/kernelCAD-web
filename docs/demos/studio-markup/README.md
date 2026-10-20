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
2026-10-20 at about 22:21 CEST, against clean HEAD `9fba5d0`. The snapshot spec
passed. The capture spec failed on its first attempt because the note editor
did not appear within five seconds of the click; it passed on retry, which
produced the current [`demo.mp4`](demo.mp4). The MP4 is 345,765 bytes,
1440×900 at 25 fps, and 13.8 seconds long.

I extracted and inspected frames at 2, 5, 8 and 11 seconds. The 2-second frame
shows the old empty project still computing with zero bodies. At 5 seconds the
Bracket is visible with the anchored “Keep the mounting face flat” note and
`Face 0 · shape 1` selected. At 8 seconds the distance label reads 20.1 mm;
at 11 seconds the loaded snapshot shows the note and measurement again. The
early empty-project frame explains why the former generic “Ready” check could
race the newly opened model.

The capture now waits for the viewer's display-ready signal: nonempty model
geometry has rendered for two frames. It also verifies that note placement is
active before clicking. These changes have local unit coverage, but the video
above predates them; rerun the capture command to verify the revised gate in
Chromium.

This is local browser evidence for `9fba5d0` and the passing retry. It does not
verify the later capture-gate change or deployed behavior; no deployment was
performed.

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
current local validation and records that the capture gate still needs a
post-change Chromium run. Local results do not establish deployed behavior or
hardware acceptance.

The replayable example is [`snapshot-v1.json`](snapshot-v1.json). The captured
browser recording is [`demo.mp4`](demo.mp4).
