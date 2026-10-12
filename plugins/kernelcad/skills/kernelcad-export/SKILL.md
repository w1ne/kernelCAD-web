---
name: kernelcad-export
description: Export a kernelCAD model to STEP, STL, 3MF, GLB, DXF or G-code through the hosted MCP, and check it before handing it over. Use when the user asks for a file to print, machine, or import into other CAD.
---

# Export

- Whole model: `export({ target: "model", code, format, output_path })` with
  `format` one of `step`, `stl`, `3mf`, `glb`, `dxf`, `gcode`.
  Options: `3mf` takes `printUnit` and `embedSource`; `dxf` takes `unit`,
  `tolerance`, `layers`; `glb` takes `axis`.
- Per part of an assembly: `export({ target: "part", code, output_dir })`.
- Before exporting for print: `inspect({ of: "part-stats", code })`. For a
  bill of materials: `inspect({ of: "bom", code })`.
- Verify a STEP after export with `inspect({ of: "step", file })`.
- The hosted server returns a download link or file reference; give the user
  that link and say which format and units it is in. Keep verification on
  (do not pass `no_verify: true`) unless the user asks.
