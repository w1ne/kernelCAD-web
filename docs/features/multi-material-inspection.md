# Multi-material boolean inspection

`inspect({ of: 'multi-material', file })` reports explicit `.material()` records
whose material differs from an attributed descendant through a boolean/shape
chain. The result identifies both feature ids and returns an assembly-part
rewrite template for review.

This is a source-level diagnostic and rewrite aid. It does **not** assign
materials to faces of the fused result or change static meshing. To render an
inlay or over-mould with distinct materials today, author the attributed
operands as separate `assemblyPart`s. Same-material overlap remains governed by
`union.member-overlap`; the new inspection does not alter that validation.

## Example workflow

```ts
const brassInsert = cylinder(8, 5).finish('brass');
const polymerBody = box(30, 30, 10).finish('abs');
const fused = polymerBody.union(brassInsert).finish('abs');
return fused;
```

Run the read-only MCP call `inspect({ of: 'multi-material', code })`. Review the
reported leaf/head ids, then restructure the source around `assembly()` and
`arm.part(name, shape, { at, material })`, keeping each attributed material as
its own part. This example is textual workflow evidence; no UI layout or
automatic geometry rewrite is provided.

## Evidence and limits

- Focused automated evidence: `src/agent/mcp/tools/inspectMultiMaterial.test.ts`
  covers differently materialled leaves, same-material cases, and subtract
  cutters.
- Live comparison/page check: attempted on 2026-10-15; network DNS was
  unavailable in the work environment, so neither comparable live workflow nor
  `kernelcad.com` could be checked.
- No MP4 is included: this is a headless read-only inspection call, and this
  environment has no usable public browser/network for an actual workflow
  recording. The example and focused test are the reproducible evidence path.
