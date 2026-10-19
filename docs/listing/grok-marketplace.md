# Grok Build built-in marketplace

Submit with a PR to `xai-org/plugin-marketplace` (checked 2026-10-19; [CONTRIBUTING.md](https://github.com/xai-org/plugin-marketplace/blob/main/CONTRIBUTING.md)). The repo is an index: one entry in `.grok-plugin/marketplace.json`, plus a regenerated `.grok-plugin/plugin-index.json`. Until the entry lands, `grok plugin marketplace add w1ne/kernelCAD-web && grok plugin install kernelcad --trust` works from the connect page.

## Planned catalog entry

Remote source pinned to a commit, with the plugin subdirectory. The validator also accepts a `path` under a url source, so the big product repo is not vendored:

```json
{
  "name": "kernelcad",
  "description": "CAD parts from a description: editable .kcad.ts models, DFM checks, STEP/STL/3MF/DXF exports and a 3D Studio viewer over the hosted kernelCAD MCP. No local CAD install.",
  "category": "design",
  "source": {
    "source": "url",
    "url": "https://github.com/w1ne/kernelCAD-web.git",
    "sha": "<40-char develop commit>",
    "path": "plugins/kernelcad"
  },
  "homepage": "https://kernelcad.com",
  "keywords": ["kernelcad", "kernelcad mcp", "kernelcad step"],
  "domains": ["kernelcad.com", "app.kernelcad.com"]
}
```

Keywords stay brand-scoped on purpose: they power the Grok plugin CTA, and generic terms like `cad` or `step` would misfire it on unrelated requests. Update = bump the `sha` to the new commit.

## Process

1. Fork `xai-org/plugin-marketplace`, branch from `main`.
2. Add the entry to `.grok-plugin/marketplace.json`.
3. `python3 scripts/generate-plugin-index.py` (fetches the pinned source; do not hand-edit the index).
4. `python3 scripts/validate-catalog.py` and `python3 scripts/generate-plugin-index.py --check`.
5. Open the PR with the template; answer the ownership and security checklists. Ownership: w1ne is the kernelCAD maintainer account and the repo is the product repo ([github.com/w1ne/kernelCAD-web](https://github.com/w1ne/kernelCAD-web)); say so in the PR body.

Note the review guidance about sourcing from an official org rather than a personal account: there is no separate kernelCAD org, so explain the w1ne ownership instead of moving the repo.

## Status
- 2026-10-19: PR open — [xai-org/plugin-marketplace#1556](https://github.com/xai-org/plugin-marketplace/pull/1556), pinned to `6617c8918275a7a7f7055a0a8cdafff2432a37ce`.
