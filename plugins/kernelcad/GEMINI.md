# kernelCAD extension

The `kernelcad` MCP server is hosted at https://mcp.kernelcad.com/mcp; no local
CAD install is needed. For CAD requests: search `lookup_cookbook` first, write
`.kcad.ts` source, check it with `evaluate_script` and `design_loop` until green,
show it once with `open_in_studio`, and export with `export`.

Use the bundled skills in `skills/`:

- `kernelcad-design-loop` for authoring and repair.
- `kernelcad-cookbooks` for canonical manufacturing patterns.
- `kernelcad-studio-paint` for saved-project visual review.
- `kernelcad-export` for checked deliverables.
- `manufacturing-readiness` for one exact revision's fabrication evidence.
- `design-trade-study` for bounded, computed variant comparisons.

For readiness and trade studies, keep PASS, FAIL, WARN, NOT_RUN, UNSUPPORTED and
ASSUMPTION separate. Missing evidence is not a pass. Bind results to an exact
project revision or source digest, and require explicit approval before any
external quote, order, print, or file transfer.
