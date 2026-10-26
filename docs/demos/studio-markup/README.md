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
2026-10-21 at 00:04 CEST, against the working tree based on `6f339ea` with the
camera-only snapshot, trim-on-blur and measurement-overlay fixes (the commit that
adds this text). Both specs passed in 18.3 seconds, with no retries. The current
[`demo.mp4`](demo.mp4) is 338,348 bytes, 1440×900 at 25 fps, and 10.8 seconds long.

Frames were inspected at 4, 8 and 10.5 seconds. At 4 seconds Studio is loading
the Bracket starter. At 8 seconds the “Keep the mounting face flat” note is
anchored on the base face with a numbered callout, a `Distance · 9.8 mm`
measurement is drawn, and the Markup panel lists `Face 5 · shape 0` and
`Edge 0 · shape 1` as picked topology. At 10.5 seconds, after **Load JSON**, the
panel reports “Snapshot loaded. The camera and markup were restored.” with the
note, measurement and picked topology shown again.

This is local capture evidence; it does not verify deployed behaviour.

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
