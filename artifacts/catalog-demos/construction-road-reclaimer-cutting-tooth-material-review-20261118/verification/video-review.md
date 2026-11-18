# MP4 inspection — 18 November 2026

The generated video was checked with `ffprobe` and visually reviewed from
extracted frames.

```text
codec:       H.264
dimensions:  1280 × 720
frame rate:  12 fps
pixel format: yuv420p
frames:      180
duration:    15.000 s
file size:   237,912 bytes
```

The five-slide contact sheet is
[`video-frames/contact-sheet.png`](video-frames/contact-sheet.png). I inspected
it and the full-resolution focused-render and verification slides. The five
catalog previews remain distinguishable in the opening rail, the before/after
tooth material is clear, the verification text fits, and the closing slide
keeps scale/silhouette and acceptance limits visible. No deployment,
simulation or hardware-acceptance claim appears in the video.

The SVG and PNG slide sources, generator, command and encoding settings are
retained with the MP4. Regenerate with:

```sh
python3 artifacts/catalog-demos/construction-road-reclaimer-cutting-tooth-material-review-20261118/make_demo.py
```
