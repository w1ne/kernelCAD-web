# One-click drawing download

The actual Studio UI recording demonstrates Drawing (PDF) downloading directly, then optional Drawing settings, preview, callout text/offset changes and Download PDF. There is no Mark reviewed step.

Local Studio changes use the live hosted API through a bounded localhost CORS proxy and immutable public mounting-plate project 12HP6xje revision 2. This demonstrates local code connected to the production CAD backend, not deployed frontend behavior or a manufactured part.

`receipt.json` retains timestamps, text and actual downloaded PDF byte counts/hashes. `capture.mjs` attaches to existing Chrome CDP9444, has a fixed lifetime, and closes only its temporary tab. `frames.zip` retains captured source frames. `encode.mjs` retains encoding instructions. The temporary proxy source and invocation are retained in the LinkedIn artifact bundle; no proxy is part of the product. `demo.mp4` uses recorded frames and truthful captions, with pauses shortened. Screenshots show the actual optional controls.

Model: [mounting plate source](../../../examples/drafting-review/mounting-plate.kcad.ts)

The same unchanged model is used for the LinkedIn showcase, generated via native MCP render_preview and export. Post/image/source/receipts are retained in `/home/andrii/projects/kernelCAD-web-artifacts/2026-10-12/drafting-linkedin/`. Nothing is published to LinkedIn automatically.
