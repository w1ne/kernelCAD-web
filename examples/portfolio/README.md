# kernelCAD portfolio

Real engineering parts and assemblies built end-to-end by an agent driving kernelCAD MCP. Every entry is sourced from a public engineering ask (GitHub issue, forum thread, design-marketplace request) and links back to the original.

## What an entry contains

```
<slug>/
  README.md       # paraphrased prompt + source URL + license + build notes
  build.kcad.ts   # parametric script the agent produced
  build.mp4       # rotation/build demo
  build.step      # parametric export
  build.stl       # mesh export
  meta.json       # structured metadata (see scripts/lib/portfolioMeta.ts)
```

## Curation rules

- Source from a real public ask. No marketing-style demos, no decorative trinkets.
- Paraphrase the ask in `README.md`; never copy the original verbatim.
- Note the source URL and SPDX license in both `README.md` and `meta.json.sourceUrl`/`.sourceLicense`.
- Verify rebuild before commit: `npm run portfolio:validate`.

## License

Portfolio entries inherit each source's license (see `meta.json.sourceLicense`). The portfolio scaffolding (this README, schema, capture scripts) is CC-BY-4.0.
