# Guarded SMLib — local workflow evidence

The retained local demo is 20 seconds, 1280×720, H.264, 24 fps, silent. This is a
recorded local-result walkthrough, not a screen recording of Studio or a
benchmark. It shows actual meshes returned by the opt-in registry build and an
actual STEP round-trip fallback diagnostic using
`@classcad/smlibwasm@0.3.1`. Direct Node import of the full GT2 source preserves
its 1613.939256648 mm³ volume; the +0.438083% mismatch in the video is measured
after the candidate is re-exported to STEP. This is local validation, not
deployed behavior or hardware acceptance. No experimental native kernel
patches are installed.

Sources: [gear.kcad.ts](gear.kcad.ts), [fillet.kcad.ts](fillet.kcad.ts),
[capture.ts](capture.ts), [render.py](render.py). The fallback source is the
original [GT2 STEP fixture](../../../tests/fixtures/smlib/gt2-raw.step).
Capture reads the script return (`rootShape`), then retains measurements,
diagnostics and the returned mesh in the evidence bundle kept out of repo at
`/Volumes/LabWired/gb/smlib-evidence/docs/demos/smlib-guarded/evidence/`. The software renderer
projects only those captured triangles; it does not construct CAD geometry.

```sh
npx tsx docs/demos/smlib-guarded/capture.ts
python3 docs/demos/smlib-guarded/render.py
ffmpeg -y -f concat -safe 0 -i /Volumes/LabWired/gb/smlib-evidence/docs/demos/smlib-guarded/evidence/slides.txt \
  -vf fps=24 -c:v libx264 -pix_fmt yuv420p -movflags +faststart \
  /Volumes/LabWired/gb/smlib-evidence/docs/demos/smlib-guarded/video.mp4
```

Renderer settings: orthographic azimuth 45°, elevation 28°, deterministic
painter depth sorting, 510 px iso in the video, 700 px canonical views. Top,
front and iso views are retained for every result. Python Pillow is required;
the font path is the macOS Arial font declared in render.py. Capture and
rendering do not launch a browser.

The retained video was inspected at 2, 7 and 12 seconds. The gear shows 20
distinct teeth, the fillet has continuous rounded edge bands, and the fallback
frame shows the full pulley with its bore, flange and hub. Text is legible.
Evidence and inspection records are kept out of repo at
`/Volumes/LabWired/gb/smlib-evidence/docs/demos/smlib-guarded/`.
