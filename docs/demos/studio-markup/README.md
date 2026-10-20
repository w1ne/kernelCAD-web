# Studio markup snapshot walkthrough

This bundle documents the version 1 snapshot fixture and the local Studio
workflow. The feature code and its prompt handoff test are in
[`src/studio/markup`](../../../src/studio/markup),
[`useAgentGeneration`](../../../src/studio/hooks/useAgentGeneration.ts), and
[`StudioGenerate.test.tsx`](../../../src/studio/StudioGenerate.test.tsx).

## Reproduce the local workflow

Start Studio with `npm run dev`, then open `http://127.0.0.1:5173/studio`.
Choose **Projects → Bracket**, open **Markup**, enter a note and click a point
on the model. Use **Measure** and click two model points. The notes and completed
measurements remain in the Markup panel. **Save JSON** downloads the current
snapshot; **Load JSON** restores its camera and overlays. The replayable example
is [`snapshot-v1.json`](snapshot-v1.json).

The focused local checks are:

```sh
npx vitest run --configLoader runner src/studio/markup src/studio/StudioGenerate.test.tsx src/studio/components/viewer/measure/edgePolylines.test.ts src/studio/components/viewer/measure/measureSnap.test.ts src/studio/components/viewer/measure/measureState.test.ts
npx playwright test tests/studio_markup_snapshot.spec.ts --project=chromium
```

`verification.json` records the checks run for this working tree. The
Playwright test is included for the repository's Studio browser suite, but was
not run locally because the current browser security review declined the
pointer-event action required for browser automation. No alternate browser was
started.

## Media status

`demo.mp4` is not included. The actual note-placement result was visible in the
existing local Studio tab, but the browser security review then declined the
measurement click and prohibited retrying through another browser API. A full
note-and-measure recording therefore could not be captured or inspected. This
bundle does not claim a video or a completed local measurement workflow.
