# Mesh Booleans

Use the MCP `mesh_boolean` tool when two imported triangle meshes need a union,
subtraction, or intersection. Each operand accepts `{ file: '/server/path/part.stl' }`
or `{ data: '<base64 mesh bytes>' }`; STL, OBJ, and 3MF are supported. The tool
returns the output volume in mm³, triangle count, and a binary STL payload.
Pass that payload to `import_step` as `content_base64` to reopen it as a mesh
body, or save it to an STL file for downstream mesh workflows.

```json
{
  "operation": "subtract",
  "a": { "file": "/server/path/housing.stl" },
  "b": { "file": "/server/path/cutter.obj" }
}
```

Mesh Booleans use Manifold and require closed, consistently oriented,
2-manifold inputs. Open edges, non-manifold edges, malformed triangles, and
invalid winding return an error. The default vertex weld tolerance is
0.000001 mm, and the default cap is 100,000 triangles per input and output.
The result remains a faceted mesh; this workflow does not reconstruct an
editable feature tree or provide B-rep face and edge references. For a single
mesh that should become editable, use `mesh_to_features` instead.
