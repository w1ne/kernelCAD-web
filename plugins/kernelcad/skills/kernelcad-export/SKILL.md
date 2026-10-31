---
name: kernelcad-export
description: Export a kernelCAD model to STEP, STL, 3MF, GLB, OBJ, PLY, USD, DXF or G-code through the hosted MCP, and check it before handing it over. Use when the user asks for a file to print, machine, simulate or import into other CAD.
---

# Export

- Whole model: `export({ target: "model", code, format, output_path })` with
  `format` one of `step`, `stl`, `3mf`, `glb`, `obj`, `ply`, `usd`, `dxf`, `gcode`.
  `obj` is a Wavefront triangle mesh. `ply` is a Stanford PLY triangle mesh
  (mm, Z-up; binary little-endian by default) with per-vertex normals and
  the part colour from `.finish()` / `.material()` / `.color()`; an assembly is
  one file with every part in world space. Options: `encoding: 'ascii'`,
  `colors: 'face'` or `'none'`, `normals: false`; a bad key fails with
  `export.ply.invalid-options`. `usd` is an ASCII USDA triangle mesh
  with millimeter units and Z-up coordinates; it is not B-rep USD. NVIDIA's
  usd-brep BrepArray is not emitted because this writer consumes tessellated
  vertices and triangle indices, while BrepArray requires full B-rep topology
  and curve/surface data. Use `usd-isaac` separately for an assembly physics
  stage. Options: `3mf` takes `printUnit` and `embedSource`; `dxf` takes `unit`,
  `tolerance`, `layers`; `glb` takes `axis`.
- Per part of an assembly: `export({ target: "part", code, output_dir })`.
- Before exporting for print: `inspect({ of: "part-stats", code })`. For a
  bill of materials: `inspect({ of: "bom", code })`.
- Verify a STEP after export with `inspect({ of: "step", file })`.
- The hosted server returns a download link or file reference; give the user
  that link and say which format and units it is in. Keep verification on
  (do not pass `no_verify: true`) unless the user asks.
