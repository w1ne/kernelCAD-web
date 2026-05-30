# Export a 3-part assembly to 3MF

Build a small fastener assembly with three named parts, each painted a
distinct color, and return the assembly model so the runtime can ship it as
a 3MF file:

- `plate` — a `60 x 40 x 4 mm` base plate, painted `#888888` (gray).
- `bracket` — a `20 x 20 x 12 mm` block sitting on top of the plate near one
  edge, painted `#cc4444` (red).
- `cap` — a `10 mm`-diameter, `4 mm`-tall cylinder sitting on top of the
  bracket, painted `#4488cc` (blue).

The eval harness exports the returned assembly to 3MF, unzips the OPC
container, and parses `3D/3dmodel.model`. It asserts:

- the zip carries `[Content_Types].xml`, `_rels/.rels`, and
  `3D/3dmodel.model`,
- the model XML declares three `<object>` entries (one per part),
- each `<base>` entry under `<basematerials>` carries the right
  `displaycolor` for that part,
- the document `unit="millimeter"`.

End the script with `return <assembly>.model();` so the runtime sees a
`SceneBackend` and routes through the multi-body 3MF path.
