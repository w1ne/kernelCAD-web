# Edge picking demo bundle

## Capture command

Run `npm run capture:edge-picking` on the Mac with Chromium and
`/opt/homebrew/bin/ffmpeg` available. The opt-in Playwright spec opens the box
example in Studio, selects two edges with a modifier click, reads the shared
selection through MCP, applies an MCP fillet to the stable edge refs, shows the
MCP endpoint and result, then loads the returned source in Studio to show the
updated model. It writes `edge-picking.mp4` and fresh geometric evidence in
`verification.json`; its temporary WebM is removed after encoding.
The spec is skipped by the normal Playwright suite unless this capture command
sets `KCAD_CAPTURE=1`.

This bundle documents the local Studio → MCP → fillet workflow. The geometric
outcome is verified by a real OCCT build; it is local validation, not a
production deployment or hardware acceptance.

## Replay

Run `npm run capture:edge-picking`. Playwright starts the configured local
Studio server, performs the picks, and drives the MCP tools. Open the resulting
MP4 to review the shared-selection response, blend result, and updated model.

The Playwright recording source is [edge_picking.capture.spec.ts](../../../tests/edge_picking.capture.spec.ts);
the optional manual MCP helper is [capture.ts](./capture.ts). MCP geometry
assertions are in [edgeSelectionBlend.test.ts](../../../tests/integration/mcp/edgeSelectionBlend.test.ts),
with run evidence in [verification.json](./verification.json).
The capture spec records the actual browser workflow and produces an MP4 when
the command above is run. The Studio mesh remains full detail; video frame
scaling changes only the displayed pixels.
