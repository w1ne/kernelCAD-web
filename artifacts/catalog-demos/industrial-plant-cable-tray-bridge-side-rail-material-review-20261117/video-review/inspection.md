# MP4 inspection

- `make_demo.py` produced a 15-second H.264 video at 1280 × 720, 30 fps,
  `yuv420p`; file size is 149,159 bytes.
- `inspect_video.py` decoded frames at 2.5 s, 7.5 s, and 12.5 s. The [contact
  sheet](contact-sheet.png) was visually opened and reviewed.
- The audit slide shows all five samples and names the selected rail finish.
  The comparison slide shows the yellow-rail baseline and the steel-rail
  result. The final slide shows the verified material mapping and labels the
  evidence as local preview rendering plus a code regression.
- No visible text clipping or frame corruption was found. Captions do not claim
  simulation, deployment, or hardware acceptance.

Invocation: `python artifacts/catalog-demos/industrial-plant-cable-tray-bridge-side-rail-material-review-20261117/inspect_video.py`
