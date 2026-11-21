# MP4 inspection

- `ffprobe` reports H.264, 1280×720, 25 fps, 14.0 seconds, 350 frames, and no
  audio stream. Metadata is retained in `ffprobe.json`.
- The entire MP4 decoded without errors with:
  `ffmpeg -v error -i industrial-plant-process-blower-motor-material-review.mp4 -f null -`.
- The five-frame contact sheet in `frames-contact-sheet.png` was opened and
  inspected. It shows the audit contact sheet, orange-motor baseline, blue-motor
  result, GLB verification card, and the final local-only scope caption.
- The captions remain readable at 1280×720. The before and after images are
  both visible as full models; the after frame retains the contrasting steel
  housing and safety-painted base/outlet.

This MP4 records local preview rendering and a software regression. It does not
show simulation, a live deployment, or hardware acceptance.
