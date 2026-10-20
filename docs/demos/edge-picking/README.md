# Edge picking demo bundle

This bundle documents the local Studio → MCP → fillet workflow. The geometric
outcome is verified by a real OCCT build; it is local validation, not a
production deployment or hardware acceptance.

## Replay

1. Run `npm run dev -- --host 127.0.0.1 --port 5180 --strictPort`.
2. Open `http://127.0.0.1:5180/studio?script=examples/edge-picking.kcad.ts`.
3. Click a BREP edge. Shift-click another edge to add it to the selection.
4. Run `KCAD_STUDIO_URL=http://127.0.0.1:5180 npx tsx docs/demos/edge-picking/capture.ts`.
   The source reads the current selection with MCP `get_selection`, passes its
   stable refs to MCP `apply_surface_blend`, and saves the returned script and
   measured verification values here. No session token is written to the bundle.
5. Paste `result.kcad.ts` into the Studio editor and run it to see the same
   operation in the viewer.

The capture source is [capture.ts](./capture.ts); the MCP geometry assertions
are in [edgeSelectionBlend.test.ts](../../../tests/integration/mcp/edgeSelectionBlend.test.ts),
with run evidence in [verification.json](./verification.json).
The interactive script writes `result.kcad.ts` and `verification.json` after a
successful local run.

An MP4 is not included in this worktree. The headless capture attempt was
blocked by the browser security review, which denied raw CDP access to the
local Studio page; the desktop screen recorder was unavailable. No substitute
or synthetic video is presented as a capture of the Studio workflow. Run the
steps above in an approved interactive capture session to produce and inspect
the requested MP4. The Studio mesh remains full detail; video frame scaling
may reduce only the displayed pixels.
