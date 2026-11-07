# 3MF resource IDs: local exporter validation

This compact demonstration replays the transcript of an actual run of the patched
`export3mfAsync` source. The fixture is a generic, injected, watertight 10 mm cube.
It exercises the writer without OCCT meshing or customer geometry.

**Local SDK validation replay; not deployed/slicer/hardware acceptance.**

## Reproduce

From the repository root, after installing its locked dependencies:

```bash
node --import tsx docs/demos/3mf-resource-ids/run.ts
python3 docs/demos/3mf-resource-ids/render_replay.py
```

The replay renderer needs Pillow, DejaVu Sans Mono, and FFmpeg. It presents actual
captured output in three held terminal panels; it is not a live screen recording.
Settings: 1280 x 720, 12 fps, 18 seconds, H.264, yuv420p, CRF 28, no audio.

## Evidence

- `run.ts`: fixture source, invocation, assertions, and evidence generation.
- `generic-cube.3mf` and `3dmodel.model`: generated archive and its extracted model.
- `evidence.json`: settings, hash of the actual exporter source,
  archive hash, IDs, and individual validation results.
- `transcript.txt`: output from the actual local exporter validation.
- `demo.mp4`: readable replay of that transcript.
- `poster.png`: representative final panel, also extracted from the MP4 for review.
- `render_replay.py`: reproducible terminal replay renderer.

The assertions verify that object and material resource IDs are unique, that
material/build references resolve, and that the exported coordinates, triangle
indices, units, and color match the input exactly. All 18 mesh edges have two
oppositely directed uses. The cube's geometry is preserved while the material
resource occupies a different ID from the mesh object.

This is a narrow exporter regression demonstration. It does not demonstrate
slicer import, a deployed service, a printer, or physical acceptance.

## Visual review

The frame extracted at 14 seconds was inspected: the final panel shows all six
validation/result lines in readable green text without clipping. The amber
caption clearly states the local replay scope. FFprobe confirms 18 seconds,
1280 x 720, H.264 at 12 fps; the MP4 is 89,302 bytes.
