# Video review

The 15.03-second H.264 video is 1280 × 720 at 30 fps in `yuv420p` and is
207,300 bytes. `video-contact-sheet.png` contains frames extracted at 1, 4, 7,
10, and 13 seconds. I inspected those frames: the five-preview audit, baseline
render, source assignment change, corrected render, and regression result are
legible and in the intended order. The captions describe local source/render
and exported-GLB regression only. There is no simulation, deployment result, or
hardware acceptance claim.

Recreate the video with `python3 .../make_demo.py`; inspect it with
`python3 .../inspect_video.py`. Invocation settings and `ffprobe` output are
retained beside this note.
