# Labeled views of a STEP import

`inspect_step_views` imports one `.step` file through the same normalized path as `lib.fromSTEP` and returns four PNGs: front, right, top, and iso. kernelCAD is Z-up. Front looks along +Y from −Y, right looks along −X from +X, top looks down from +Z with screen up +Y, and iso sits in the +X, −Y, +Z octant.

Each image labels the largest visible faces and the longest visible edges. The remaining ids are listed in a legend band under the model. `height` is the model viewport in pixels (default 260). The PNG is 56 px taller than `height`. `width` defaults to 360.

The reply is compact: image paths, a face list, and an edge list. `detail: true` inlines label placements. The same full report is written to `report.json` and can be read back with `report_id` or `report_path` without passing `file`.

## Selectors belong to this import

`importGeneration` is `<feature id>@<first 16 hex chars of the file sha256>`. `refScope` says the selectors name faces and edges of that import and do not survive healing or a later edit.

| Field | Meaning |
|---|---|
| `faces[i].id` | Short id drawn on the image, such as `f3`. |
| `faces[i].listRef` | The `@kc[...]` string `inspect({ of: 'faces' })` emits. |
| `faces[i].ref` | The selector `hole` and `offsetFaces` accept. |
| `edges[i].ref` | `@kc[<owner>/edge/eN]`, which edge edits accept. |

On an unlabeled import the face segment is positional `fN`. Face edits reject that id. `ref` is then the FaceQuery `{ near: [x, y, z] }` at the face centroid, rounded to 1e-6 mm. A named face keeps its `@kc` string as `ref`. A fresh import has no history map, so `@kcq[face(closestTo(...))]` does not see these faces.

Pass `target_face` as an id, a `listRef`, or the JSON text of `ref` from this same reply. The face is filled in every view where it faces the camera, and its boundary is drawn where that boundary is in front of the solid. A view that cannot see the face reports `targetVisible: false` and `targetPixels: 0`. An unknown target returns `ok: false`, `errorCode: feature.selection.no-match`, the face and edge lists, and no images.

Images are filesystem paths. When `KERNELCAD_ARTIFACT_BASE_URL` is set, each image also has `url` set to that base plus the file name.

```json
{
  "file": "docs/demos/step-to-features/source.step",
  "target_face": "f0",
  "width": 480,
  "height": 340
}
```

Use the returned `faces[i].ref` in a script on that same import, for example `part.offsetFaces(ref, 1)` or `part.hole(ref, { u: 0, v: 0, diameter: 2, depth: 2 })`. Query the face before the edit. The edit creates a new generation.

A local render of `docs/demos/step-to-features/source.step` is in [docs/demos/step-inspect-views](../demos/step-inspect-views/README.md). That folder is an inspect render on this machine. Deployed behavior and hardware acceptance are separate checks.
