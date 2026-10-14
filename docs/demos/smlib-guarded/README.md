# Guarded SMLib — local workflow evidence

[Video](video.mp4): 20 seconds, 1280×720, H.264, 24 fps, silent. This is a
recorded local-result walkthrough, not a screen recording of Studio or a
benchmark. It shows actual meshes returned by the opt-in registry build and
an actual legacy-STEP fallback diagnostic. No deployed or hardware acceptance
is claimed. No experimental native kernel patches are installed.

Sources: [gear.kcad.ts](gear.kcad.ts), [fillet.kcad.ts](fillet.kcad.ts),
[capture.ts](capture.ts), [render.py](render.py). The fallback source is the
original [GT2 regression fixture](../../../tests/fixtures/smlib/gt2-raw.step).
Capture reads the script return (`rootShape`), then retains measurements,
diagnostics and the returned mesh in `evidence/*.json`. The software renderer
projects only those captured triangles; it does not construct CAD geometry.

```sh
zsh -lic 'npx tsx docs/demos/smlib-guarded/capture.ts'
python3 docs/demos/smlib-guarded/render.py
ffmpeg -y -f concat -safe 0 -i docs/demos/smlib-guarded/evidence/slides.txt \
  -vf fps=24 -c:v libx264 -pix_fmt yuv420p -movflags +faststart \
  docs/demos/smlib-guarded/video.mp4
```

Renderer settings: orthographic azimuth 45°, elevation 28°, deterministic
painter depth sorting, 510 px iso in the video, 700 px canonical views. Top,
front and iso views are retained for every result. Python Pillow is required;
the font path is the macOS Arial font declared in render.py. No browser is
launched by capture or rendering.

Verification: native gear extrusion accepted (sketch node has an explicit
OCCT fallback); polygon extrusion and G1 fillet accepted with no diagnostics;
legacy GT2 final STEP interchange rejected at +0.438083% volume drift, returned
OCCT volume 1613.939256647417 mm³. See the three JSON records and
[inspection record](evidence/inspection.md).

The repository's `kernelcad render inspect` was also attempted with
`PW_CDP_URL=http://127.0.0.1:9222` and attachment required. Existing Chrome
PID 51088 had no CDP listener; attachment failed with ECONNREFUSED. No duplicate
browser was launched and the user's browser remained running. Thus the
canonical images here are software projections of the actual captured result,
not a successful CLI/browser render-inspect packet. The temporary static-player
server closed with the one-shot command.

Full app `npm run build` fails on the unchanged Node-font `dirname` browser
import; the same failure reproduces using the original #937 registry. A
focused Vite build of the SMLib runtime passed and emits a separate dynamic
chunk; default factory/capability tests forbid eager package loading.
