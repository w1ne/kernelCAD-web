# Reproduce Ray-Ban Meta smart glasses (Wayfarer) as a kernelCAD model

Build the iconic Ray-Ban Meta Wayfarer silhouette from primitives — recognizable as Meta smart glasses, not generic eyewear. Front-face only (skip temples in v1).

Required identifying features:

- Wayfarer trapezoidal lens shape: top edge wider than bottom (~38 mm vs 34 mm in lens height; ~52 mm lens width). Two lenses, mirror symmetric about the bridge midline.
- Bridge: ~18 mm gap between lenses with a small nose notch carved into the bottom center of the bridge.
- Outer frame: rounded-rectangle perimeter (142 mm × 46 mm × 6 mm) with ~8 mm corner radius, fillet on all edges.
- Dark lens inserts: thin (~1.4 mm) trapezoidal slabs sitting recessed (~1 mm) inside each lens cavity.
- **Camera bumps**: two small protruding cylinders (radius ~3.5 mm, height ~2.5 mm) on the outer-top corners of the frame front face. This is the Meta-specific identifying detail.
- **LED recording indicator**: small flat cylinder (radius ~1.2 mm) on the right side, between the camera bump and the bridge — the recording-status light.

Z-up coordinates, millimetres. Center the assembly at origin in X (mirror about X=0). Return the final unioned `Shape`.
