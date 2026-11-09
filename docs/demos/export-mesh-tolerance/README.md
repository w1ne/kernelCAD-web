# Mesh tolerance export demo

This small local replay runs the public `export_model` tool on a native kernelCAD
plate, writes an STL with a requested 0.01 mm tolerance, reads the exported
triangle count and header back, and records the tool's sampled deviation report.
The video's plate image is drawn from the Float32 triangle coordinates in that
actual STL file.

**Local export workflow replay; not deployed, slicer, or hardware acceptance.**

## Reproduce

From the repository root, with the locked dependencies installed:

```bash
node --import tsx docs/demos/export-mesh-tolerance/demo.ts
python3 docs/demos/export-mesh-tolerance/render_demo.py
```

The render step needs Pillow, DejaVu Sans Mono and FFmpeg. It creates an 18-second
1280 x 720 H.264 video at 12 fps, yuv420p, CRF 28, with no audio. Settings are
`format=stl` and `options.tolerance=0.01` mm. The part is a 30 x 20 x 4 mm plate
with two 6 mm through-holes.

## Evidence

- `part.kcad.ts`: native CAD source passed to the public export tool.
- `demo.ts`: invocation, assertions, and evidence generation.
- `tolerance-plate.stl`: actual STL output from `exportModelTool`.
- `verification.json`: invocation settings, report, source/export/output hashes,
  triangle count, and explicit non-acceptance fields.
- `transcript.txt`: output from the actual local export call.
- `render_demo.py`: deterministic replay renderer that reads the STL triangles.
- `demo.mp4` and `poster.png`: rendered replay and representative frame.

The run wrote 2,036 triangles and reported a requested tolerance of 0.01 mm, a
sampled maximum of 0.000233 mm, and a sampled p95 of 0.000233 mm across 2,715
deterministically selected samples. This is a one-sided sampled B-rep surface to
export-triangle measurement; `global_max_certified` is false. These numbers do
not establish a certified maximum, dimensional inspection, slicer acceptance,
or print fit.

## Visual review

The 8-second frame was inspected: it shows the two through-holes in the top view
rendered from the exported STL facets, with the triangle count and requested
tolerance visible. The final report panel keeps requested tolerance, sampled
measurements, and the certification limit visible without clipping. FFprobe
confirms 18 seconds, 1280 x 720, H.264 at 12 fps; the MP4 is 96,359 bytes.
