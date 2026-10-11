# Local drawing-review walkthrough

[demo.mp4](demo.mp4) shows the actual local Studio dialog: generate a drawing,
select a hole callout, edit its primary text and extra offset from 0 to 8 sheet mm,
refresh, mark the fresh preview reviewed, and click **Export reviewed PDF**.
The engineering tolerance frame remains attached to the edited primary label.

This is **local validation of an illustrative model**, not hosted behavior or
physical acceptance. The video uses recorded UI cuts, with captions outside the
product UI. It includes actual intermediate typing, draft/review transitions and
export progress. The initial saved callout contained an earlier review note;
the walkthrough replaces it with `4 × Ø9 THRU — VERIFY`.

## Retained source and evidence

- [mounting-plate.kcad.ts](mounting-plate.kcad.ts): exact model source snapshot.
- [capture.mjs](capture.mjs), [capture-cdp.mjs](capture-cdp.mjs): bounded capture
  helper; attaches to the existing Chrome CDP session on **9444**, creates and
  closes only its own tab. It never launches Chrome.
- [captured-frames.zip](captured-frames.zip): all 22 actual captured JPEG frames.
- [receipt.json](receipt.json): UTC capture time, actual frame timing, observed
  controls/text at six workflow stages, viewport and exported PDF magic/hash.
- [01-draft.png](01-draft.png), [02-preview.png](02-preview.png),
  [03-edited.png](03-edited.png), [04-refreshed.png](04-refreshed.png),
  [05-reviewed.png](05-reviewed.png), [06-exported.png](06-exported.png): full
  verification screenshots; video crops to the modal to keep the workflow clear.
- [reviewed-drawing.pdf](reviewed-drawing.pdf): actual Blob downloaded by the UI's
  existing exporter, captured without changing transport. 12,632 bytes;
  magic `%PDF-1.4`; SHA-256
  `1eb83f7449dc0d9a887edb294db25f96f3ce6f75f48360ba922b394342da3822`.
- [contact-sheet.png](contact-sheet.png), [ffprobe.json](ffprobe.json): decoded
  MP4 keyframes and media metadata, inspected after encoding.

Capture source state: public worktree HEAD
`906c67b078868fc3d64a12276991a847540dcc13` plus the pending upstream merge.
No product source changes were made for recording.

## Invocation and settings

Run from the repository root, with an **already running** Chrome on CDP9444.
Use a clean local demo project if reproducing the exact initial preferences.
The Vite process has a 300-second lifetime; the helper has a 180-second lifetime
and each CDP command has a 10-second timeout. Stop your owned Vite/helper afterward
and leave the user's Chrome running.

```sh
timeout 300 node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5248 --strictPort
node docs/demos/drafting-review/capture.mjs
```

Capture viewport: 1440×1100, device scale 1, JPEG quality86. Screenshot sampling
requested 250ms; this machine returned 22 frames over 47.915 seconds. The receipt
retains actual timings. A second event-screencast attempt timed out before
recording and was discarded; the MP4 uses only the successful captured workflow.

The encoding script crops each recorded modal and pads it without stretching;
it adds factual captions, retains all actual frames, and shortens their holds by
factor0.82. It does not synthesize UI states. To rebuild from retained evidence:

```sh
unzip -o docs/demos/drafting-review/captured-frames.zip -d docs/demos/drafting-review
python3 docs/demos/drafting-review/encode.py
ffmpeg -hide_banner -loglevel error -safe 0 \
  -i docs/demos/drafting-review/frames.ffconcat -r 24 \
  -c:v libx264 -preset fast -crf 20 -pix_fmt yuv420p -movflags +faststart -an \
  -y docs/demos/drafting-review/demo.mp4
ffprobe -v error -show_streams -show_format -of json \
  docs/demos/drafting-review/demo.mp4
ffmpeg -hide_banner -loglevel error -i docs/demos/drafting-review/demo.mp4 -f null -
```

Encoding needs FFmpeg and Python Pillow/DejaVu Sans. Final video: H.264,
1152×1060, 24fps, 42.667 seconds, no audio, 516,758 bytes. Full decode completed
without errors. The contact sheet and intermediate edit/export frames were
visually inspected; the drawing, editor and review/export controls are readable.
