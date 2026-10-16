# Display mesh import

**Research checked 2026-10-15.** Onshape describes mixed modeling, where mesh
and exact BRep bodies coexist in assemblies and features can act across the two
representations ([Onshape](https://www.onshape.com/en/blog/mixed-modeling-brep-geometry-mesh-data)).
Fusion exposes an explicit mesh-to-BRep conversion workflow ([Autodesk](https://help.autodesk.com/view/fusion360/ENU/?caas=caas%2Fsfdcarticles%2Fsfdcarticles%2FHow-to-Convert-a-Mesh-to-a-BRep-in-Fusion-360.html)).
FreeCAD separates Mesh objects from Part shapes, with conversion as a deliberate
bridge ([FreeCAD](https://github.com/FreeCAD/FreeCAD-documentation/blob/main/wiki/Part_ShapeFromMesh.md)).
CadQuery's import/export docs describe STL as mesh-based and document conversion
for Three.js display ([CadQuery](https://github.com/CadQuery/cadquery/blob/master/doc/importexport.rst)).
Zoo's file conversion API chooses `mesh` or `brep` representation explicitly
([Zoo](https://zoo.dev/docs/developer-tools/api/file/convert-cad-file-with-defaults)).
Three.js uses indexed `BufferGeometry` for GPU geometry ([Three.js](https://threejs.org/docs/pages/BufferGeometry));
large interactive scenes commonly add BVH acceleration for picking. SOLIDWORKS
separates graphics mesh bodies from mesh BRep and standard BRep bodies, and
documents facet-count limits for standard BRep import ([SOLIDWORKS](https://help.solidworks.com/2025/english/SolidWorks/sldworks/c_stl_files.htm?id=18.15.29)).

## kernelCAD approach

Keep `lib.fromSTL()`'s topology-recovering behavior intact. Add an explicit
display-only `lib.meshFromSTL()` path that reads ASCII or binary STL into
indexed `Float32Array` positions and `Uint32Array` indices, retaining every
triangle. Treat it as a render mesh body with bounds, rigid transforms, assembly
placement, finish/color metadata, and mesh-level validation. Do not route it
through OCCT face construction. Solid-only operations fail with a clear message;
a future explicit `toBRep()` can pay the conversion cost on demand.

The representation keeps imports fast and detail lossless, at the cost of
topology queries, booleans, mass properties, and manufacturing operations until
conversion. Initial import uses position welding for indexing; BVH picking,
instanced GPU buffers, mesh booleans, and lazy conversion are follow-up work.
