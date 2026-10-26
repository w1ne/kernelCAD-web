# Hole-less board cradle cookbook demo

[Watch the 12-second demo](demo.mp4). It shows the native kernelCAD workflow: find the `holeless-board-cradle` recipe, execute it through the MCP tool, and inspect the resulting rail geometry against the ESP32 DevKitC size and no-hole status.

The video is a captioned still sequence made from the geometry preview, not a screen recording. The full `execute_cookbook` path was exercised locally by `tests/integration/examples/holelessBoardCradleCookbook.test.ts`; local tests establish geometry evaluation and lookup/execute behavior. The preview shows the floor datum, side rails, edge catches and -X access opening. Selecting `-X`, `+X`, `-Y` or `+Y` aligns the board's long axis and connector opening with that edge. It does not establish clip flex, exact component keep-outs, physical fit or hardware acceptance.

## Reproduction

From the repository root:

```sh
python3 docs/demos/k6-holeless-board-cradle/make-demo.py
```

The script uses Pillow and `ffmpeg` (`libx264`, 1280×720, 24 fps, three four-second caption cards, no audio). It selects an installed Arial-compatible font when available, supports `KERNELCAD_DEMO_FONT` for an explicit font path, and falls back to Pillow's built-in font. `cradle-preview.png` is the kernelCAD static-player ISO view generated from `examples/cookbook/holeless-board-cradle.kcad.ts` with `views=["iso"]`, 1280×720, `autosave=false`, and no watermark. The render had valid geometry, bounds 59.5×33×15.1 mm and no diagnostics. The source recipe is retained in the repository.

## Verification evidence

- `npx vitest run --configLoader runner tests/integration/examples/holelessBoardCradleCookbook.test.ts src/agent/mcp/toolNameConsistency.test.ts tests/unit/skill/skillToolCountDrift.test.ts src/agent/mcp/toolRegistry.publicContract.test.ts` — 47 tests passed.
- `npx tsc --noEmit -p .` — passed.
- `npx eslint examples/cookbook/holeless-board-cradle.kcad.ts tests/integration/examples/holelessBoardCradleCookbook.test.ts` — passed.
- Render preview — `valid: true`, 0 diagnostics; visual evidence is `cradle-preview.png`.
