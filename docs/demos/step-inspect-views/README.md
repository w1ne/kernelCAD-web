# Labeled STEP inspect views

`inspect_step_views` imports one STEP file through the normalized `lib.fromSTEP` path and writes four PNGs: front, right, top, and iso. Face and edge labels use the same ids the face and edge lists return. The highlighted face on this plate is the top plane, `f4`, area about 3841.7 mm², centroid `(40, 25, 10)`.

This is a local inspect render. Deployed behavior and hardware acceptance are separate checks.

- [Front](front.png), [right](right.png), [top](top.png), [iso](iso.png)
- [Video](demo.mp4)
- [Render source](render.ts)
- [Measured reply](verification.json)

Recreate from the repository root:

```sh
node --import tsx docs/demos/step-inspect-views/render.ts
FFMPEG=/opt/homebrew/bin/ffmpeg node docs/demos/step-inspect-views/make-video.mjs
```

The source solid is `docs/demos/step-to-features/source.step` (80 × 50 × 10 mm plate, R5 vertical fillets, four Ø6.6 through holes). `height` is the model viewport (340 px). Each PNG is 480 × 396 because of the 56 px legend band. `verification.json` records the import generation, the `{ near }` face selector, and the highlight pixel count per view.
