# Mesh tolerance for STL, 3MF and OBJ exports

Pass an absolute mesh tolerance in millimetres when exporting a solid:

```ts
export({
  target: 'model',
  file: 'part.kcad.ts',
  output_path: 'part.stl',
  format: 'stl',
  options: { format: 'stl', tolerance: 0.01 },
});
```

The minimum accepted value is `0.001` mm. `angularToleranceDeg` optionally sets a finer normal-angle limit; values must be finite, above zero and at most 180 degrees, and their radian conversion must remain finite and positive. The same mesh controls apply to `3mf` and `obj`, including single-solid exports, and `target: 'part'` applies them to each STL in a solved assembly. With no tolerance option, the existing mesh and file bytes stay unchanged.

The export first checks whether its current mesh meets the requested sampled deviation. It keeps that mesh when it does. Otherwise, it re-meshes the export in absolute mode and checks the resulting triangles. A request cannot make the current mesh coarser. If the measured maximum is above `1.05 × tolerance`, the export returns `export.mesh.tolerance-not-met` and retains the file for inspection. Invalid tolerance values fail before a file is written with `export.mesh.tolerance-invalid`.

Successful STL output stores the requested tolerance in its free-form 80-byte header as `requested-mesh-tolerance`. 3MF stores it as requested mesh tolerance in the core model's `Description` metadata. OBJ stores it as a requested mesh tolerance comment in `model.obj` inside the exported ZIP. No custom STL data field or new file format is introduced.

The export result includes:

```json
{
  "mesh_deviation": {
    "requested_mm": 0.01,
    "measured_max_mm": 0.005,
    "measured_p95_mm": 0.004,
    "samples": 1200,
    "triangles": 4800,
    "measurement": "sampled_brep_surface_to_export_triangles",
    "global_max_certified": false
  }
}
```

The measurement projects triangle centroids and edge midpoints from the export-grade triangulations onto their owning exact B-rep faces. It then measures the one-sided distance from up to 4,000 deterministically selected surface samples to the triangles in the output mesh. Output triangles are indexed in bounded chunks of 8,192, with every chunk searched for each sample; this keeps extra index memory bounded without treating a partial scan as complete. STL distances use the Float32 coordinates read back from the encoded file. `measured_max_mm` and `measured_p95_mm` describe those samples only; they are not a certified global maximum, a symmetric Hausdorff distance, a dimensional inspection, or evidence that the part will fit after printing. Mesh-solid inputs have no exact B-rep to compare against, so a tolerance request fails with `export.mesh.tolerance-unavailable`.

For `target: 'part'`, each `written[]` entry carries its own `mesh_deviation` report beside the watertight result. Triangle counts in the report are the counts for that exported file.

See the [local export demo bundle](../demos/export-mesh-tolerance/README.md) for the retained example source, STL, measured report, invocation, and short video replay.
