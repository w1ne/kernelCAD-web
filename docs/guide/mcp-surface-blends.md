# Authoring surface blends with MCP

`apply_surface_blend` adds a fillet or chamfer to an existing Shape binding in a
`.kcad.ts` script and evaluates the patched source. For example:

```json
{
  "code": "const body = box(20, 20, 20);\nreturn body;",
  "shape_binding": "body",
  "operation": "fillet",
  "radius": 2,
  "selector": { "face": "top" },
  "continuity": "G2"
}
```

The returned `new_code` authors the operation through the existing public
`Shape.fillet(..., { continuity })` or `Shape.chamfer(...)` API. Fillet
continuity supports G1 and G2. The tool reports evaluation success and
diagnostics; it does not extract the generated blend surface's NURBS poles.
That still requires kernel surface extraction. A successful local evaluation is
not a deployment or hardware acceptance claim.
