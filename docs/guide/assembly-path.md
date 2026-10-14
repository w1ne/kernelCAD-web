# Check assembly removal paths

Use the MCP verifier to test whether assembly parts can leave along a straight line:

```json
{
  "check": "assembly-path",
  "file": "assembly.kcad.ts",
  "assembly": "my-assembly",
  "directions": [[1, 1, 0]],
  "disassemblyOrder": true
}
```

`file` or inline `code` supplies the model. Select `assembly` when more than one assembly was lowered. The six world-space directions ±X, ±Y and ±Z always participate. Additional `directions` are nonzero finite vectors, normalized and deduplicated. Supply a hole or fastener axis in world coordinates explicitly; automatic axis inference is not included.

Each entry in `parts` describes the **original assembly**: `part`, `removable`, `validDirections`, and `directions`. Each tested direction includes `direction`, `distanceMm`, `clear`, and `blockingParts`. Travel continues until the moving part's bounding box clears the assembly bounding box. A continuous triangle sweep checks the entire interval, so it does not skip an obstacle between sampled poses. A clear removal path also gives an insertion path by reversing the same translation with the other parts fixed.

With `disassemblyOrder: true`, the checker repeatedly removes the first freed part in assembly order and recomputes against the remaining parts. `removalOrder` contains `{part, direction}` steps; `stuckParts` contains what remains. This pass does not change `parts` or mutate the model. `ok` means every original part has a clear direction when the pass is off, or the pass removed every part when it is on. An order may succeed even when some initial parts are blocked.

This is local validation of oriented, closed, manifold triangle meshes, not exact BREP or hardware acceptance. Curved surfaces inherit the export mesher's approximation. Positive-travel contact is conservatively blocked; starting contact can block sliding, although contact only at exactly zero travel while departing is allowed. Positive overlap is blocked even below 1e-9 mm of travel. Containment uses oriented solid-angle winding; numerically ambiguous classifications return an error rather than a clear result. Rotations, mates, fixtures, tool access, deformation and unthreading are outside the check. The greedy pass does not search alternative paths or solve general assembly planning. Invalid geometry, missing/ambiguous assemblies, more than 128 parts, more than 64 extra directions, or more than two million total work units return an error rather than a clear result. The shared budget covers mesh preprocessing and BVH construction, containment triangle visits, broad-phase node/triangle visits (including rejected bounds), and narrow-phase collision tests across the initial check and the entire disassembly pass. Stationary triangles are queried through the existing BVH rather than scanned pairwise. Dense assemblies may need simplification or smaller subassemblies.
