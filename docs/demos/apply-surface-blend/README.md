# `apply_surface_blend` demonstration bundle

The retained invocation runs the MCP tool handler on a box, authors a selected
G2 fillet using the public `Shape.fillet` API, and records the actual evaluator
result. It demonstrates a local source-checkout invocation and solid evaluation;
it does not extract blend-surface poles, verify deployed behavior, or establish
hardware acceptance.

View the [five-second demonstration](demo.mp4).

## Reproduce

```sh
export PATH=/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:$PATH
npx tsx docs/demos/apply-surface-blend/demo.ts
python3 docs/demos/apply-surface-blend/make_demo.py
ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1 docs/demos/apply-surface-blend/demo.mp4
```
