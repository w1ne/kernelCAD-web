# MCP step evidence demo

[MP4 demo](demo.mp4) · [result and provenance](evidence/result.json) ·
[shared frame](evidence/frame.json) · [pixel alignment](evidence/alignment.json) · [test evidence](evidence/tests.json)

Local validation captured on 2026-10-13. The actual modeling workflow builds a
60×40×20 mm plate (48000 mm³), then widens it to 90 mm and cuts a Ø12 through-hole (69738.05 mm³).
Both builds report valid build evidence. Immutable BREP states are rendered at
the same iso camera fit; the hole and extra length appear while unchanged corners retain their image positions.
The decoded MP4 was inspected at both modeling steps. The hole is visibly open
at the top face, the plate fits the image, and captions are readable.

The existing Chrome session was reused through its Playwright extension adapter.
This validates real kernel builds, the step evidence writer, shared frame and
existing player renderer. It does **not** claim a deployed feature, hardware
acceptance, or an end-to-end CDP run: the unmodified evaluator truthfully reports
snapshots unavailable without `PW_CDP_URL`; the adapter supplies the captured
images to the same evidence helper. Build validity is not a topology certificate.

Reproduce from the worktree with Node 22:

```sh
npm run build:player
npx tsx docs/demos/mcp-step-snapshots/capture.ts
```

Within its 60-second idle / 5-minute lifetime, run [browser-capture.js](browser-capture.js)
in the already-running Playwright extension session, substituting the printed
bridge and player URLs. Only the helper's HTTP servers stop; Chrome stays running.

```sh
npx tsx docs/demos/mcp-step-snapshots/make-video.ts
ffmpeg -y -framerate 1/3 -i docs/demos/mcp-step-snapshots/evidence/demo-%d.png -c:v libx264 -r 24 -pix_fmt yuv420p -movflags +faststart docs/demos/mcp-step-snapshots/demo.mp4
ffmpeg -y -ss 4 -i docs/demos/mcp-step-snapshots/demo.mp4 -frames:v 1 docs/demos/mcp-step-snapshots/evidence/video-inspection.png
```

Retained source includes the capture script, browser invocation, caption/video
script, original modeling scripts, BREP replay scripts, BREP states, PNGs, frame,
raw evaluation results, and decoded-video inspection image. Public-page
verification waits for deployment after review; this PR deploys nothing.
