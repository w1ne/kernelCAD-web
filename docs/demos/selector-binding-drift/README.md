# Selector binding drift

A plate with a boss, and a fillet whose selector asks for an up-facing face of
700 to 900 mm2. At w = 30 the selector binds to the plate top and the fillet
lands there. At w = 50 the same script and selector bind to the boss top
instead; the model still builds, and `selector.binding-changed` names the old
and the new face. At w = 34 the same face only resized, so the report is the
info-level `selector.binding-moved` and nothing is flagged.

Local capture evidence from the real kernel render path. Not a deployed-behavior
or hardware claim.

- [Video](demo.mp4)
- [Caption script](captions.py) (Pillow overlay on the rendered PNGs)
- Model: `examples/selector-binding-drift.kcad.ts` (fillet radius 2 in the video so the
  rounded edges show; the example uses 1)

Capture command (from the repo root, after `npm run build:cli && npm run build:player`):

```sh
for w in 30 50 34; do
  sed "s/\"w\", 30/\"w\", $w/; s/fillet(1,/fillet(2,/" examples/selector-binding-drift.kcad.ts > w$w.kcad.ts
  node dist/cli/index.js render w$w.kcad.ts --preset publish --pose 35,30 --width 1280 --height 720 --no-watermark -o w$w.png
done
python3 captions.py   # adds the title, pointer and caption bar -> s1.png s2.png s3.png
ffmpeg -loop 1 -t 5 -i s1.png -loop 1 -t 6 -i s2.png -loop 1 -t 5 -i s3.png \
  -filter_complex "[0][1][2]concat=n=3:v=1:a=0,fps=24,format=yuv420p" -c:v libx264 -crf 28 -preset slow -movflags +faststart demo.mp4
```

The captions quote the output of `kernelcad evaluate wide.kcad.ts --baseline before.json`
(see the example header).

Capture evidence: 2026-10-24, base commit b3a98a70 plus this branch's changes, static
player (chromium headless shell 1208), 1280x720, 24 fps, 16 s, 115426 bytes.

Inspection: frames read at 2 s, 8 s and 13.5 s.
- 2 s (w = 30): plate with the boss; the plate top, which carries the fillet, is rounded
  at its outer edges; pointer and label "filleted face: plate top (box_1)"; caption shows
  the selector.
- 8 s (w = 50): the wider plate has sharp edges and the boss top is rounded; label
  "filleted face: boss top (box_2)"; red caption "WARN selector.binding-changed: was PLANE
  face 'top' of box_1, now PLANE face 'top' of box_2. The model still builds."
- 13.5 s (w = 34): plate top rounded again, same face; blue caption "INFO
  selector.binding-moved: area 800 -> 880, centroid moved 2 mm."; no warning.
