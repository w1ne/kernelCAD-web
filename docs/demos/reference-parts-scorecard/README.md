# Reference-parts scorecard demo

[Watch the local OCCT validation run](demo.mp4). The clip shows the real
`npm run test:reference-parts` output for all 27 native models, including the
measured metric deltas and per-part timings. The deterministic Markdown report
does not include timings.

This is local validation of the worktree. It does not establish deployed
behavior or hardware acceptance.

## Reproduce

From the repository root:

```sh
npm run reference-parts:regenerate
python3 docs/demos/reference-parts-scorecard/create_demo.py
```

`create_demo.py` runs the gate itself and retains its exact output in
`run-output.txt`. It renders three 1920×1080 Pillow frames and encodes them as a
silent 24 fps H.264 MP4 with FFmpeg (`libx264`, CRF 26). `verification.json`
records the invocation, gate result, manifest/transcript/video hashes, and
FFprobe media details.

## Bundle contents

- `create_demo.py` — source and invocation for capture, rendering, encoding,
  and media verification.
- `run-output.txt` — actual gate output used in the video.
- `verification.json` — deterministic settings and the verification receipt
  for the generated video.
- `demo.mp4` — the inspected video deliverable.
