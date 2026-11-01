# PLY export: a coloured assembly in one mesh file

`format: 'ply'` writes a Stanford PLY triangle mesh for MeshLab, Blender,
trimesh and Open3D. This shaft support has three parts: an anodized-black
plate with four M4 clearance holes, a steel shaft and an orange set collar.
One export writes all three into a single file, each part in world space and
in its own colour:

```sh
kernelcad export ply docs/demos/ply-export/mount.kcad.ts -o docs/demos/ply-export/mount.ply
# MCP: export({ target: 'model', file, format: 'ply', output_path })
```

| | value |
| --- | --- |
| encoding | `binary_little_endian 1.0` (default; `options.encoding: 'ascii'` for text) |
| vertex element | `x y z` (float, mm, Z up), `nx ny nz` (float), `red green blue` (uchar) |
| face element | `property list uchar int vertex_indices` (triangles) |
| counts | 25,240 vertices, 42,428 triangles, 1,233,449 bytes |
| bbox | (0, 0, −12) to (60, 60, 38) mm |
| colours | plate 26,28,30 (`anodized-black` finish) · shaft 138,141,144 (`steel` finish) · collar 232,116,42 (`#e8742a`) |
| header | `comment part 0 plate`, `part 1 shaft`, `part 2 collar` |

The normals are per vertex. Where faces meet at more than 30°, the vertex is
written once per face, so the plate stays flat-shaded and the shaft and collar
are smooth. This adds vertices but not triangles: the triangle count is the
export mesher's, the same one STL, OBJ and USD use.

View the [5-second turntable](demo.mp4). `still-iso.png` and `still-top.png`
are stills from the same renderer. Every frame was drawn from `mount.ply`
alone (its positions, normals and colours), not from the CAD model.

## Independent read-back

`verify_trimesh.py` loads the file with trimesh 5.2.0
(`trimesh-check.json`). It read the same 25,240 vertices and 42,428 faces,
bounds (0, 0, −12) to (60, 60, 38), the three part colours, and unit-length
normals. The ASCII variant with face colours
(`--options '{"encoding":"ascii","colors":"face"}'`) loads in trimesh as
face colours with the same three values.

## Files

- `mount.kcad.ts`: the model (source of truth).
- `demo.ts`: runs the CLI export function (`exportScript`, the code behind
  `kernelcad export`). It then reads `mount.ply` back with the repository's
  test PLY reader (`tests/helpers/plyParse.ts`), writes `result.json`, renders
  the stills and frames with a small Gouraud z-buffer rasterizer, and encodes
  them with `ffmpeg -c:v libx264 -pix_fmt yuv420p`.
- `mount.ply`: the exported file. SHA-256
  `cac068e0a101c6a7a5297e28331a5e650d1fffca2099683d089b17b7f62d5e9e`.
- `verify_trimesh.py`, `trimesh-check.json`: the independent read-back.

## Reproduce

```sh
npx tsx docs/demos/ply-export/demo.ts
python -I docs/demos/ply-export/verify_trimesh.py docs/demos/ply-export/mount.ply
```

This was a local run of the export and the renderer. It does not show the
hosted MCP service, Studio, or a printed part.
