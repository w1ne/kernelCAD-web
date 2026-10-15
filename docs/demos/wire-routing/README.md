# `route_wires` analysis demo bundle

This bundle shows the local route analysis against the checked-in Argon/LabWired
handoff fixture. It is not a deployment recording or a physical harness test.

- Source fixture: `tests/fixtures/argon/handoff-drawbot.json`
- Source/invocation: `node --experimental-strip-types docs/demos/wire-routing/demo.mjs`
- Render source: `python3 docs/demos/wire-routing/render.py`
- Encoder: `ffmpeg -y -hide_banner -loglevel error -i docs/demos/wire-routing/demo.gif -vf 'fps=12,scale=1280:-2:flags=lanczos' -c:v libx264 -pix_fmt yuv420p -movflags +faststart docs/demos/wire-routing/demo.mp4`
- Verification: `ffprobe -v error -show_entries format=duration,size -show_entries stream=width,height,codec_name -of json docs/demos/wire-routing/demo.mp4`
- Result: 24 handoff wires; 10 route estimates; 14 unresolved endpoints; 9 routed wires collide with estimated part boxes.

`demo.mp4` is a 7-second, 1280×720 H.264 explanation of the computed route
metrics and sample polyline geometry. `demo.gif` and `frames/` are inspection
artifacts from its source renderer. Captions distinguish local fixture analysis
from deployed behavior and physical acceptance.
