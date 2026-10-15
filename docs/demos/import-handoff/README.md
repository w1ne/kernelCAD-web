# `import_handoff` local demo evidence

[Watch the MP4 demo](./demo.mp4). The short title-card video summarizes the
locally validated workflow and its limits; it is a readable MP4 placeholder
because an actual product UI capture is unavailable. [title-card.svg](./title-card.svg)
is its retained source and [ffprobe.json](./ffprobe.json) records media metadata.

This bundle records local validation of the LabWired drawbot fixture against `import_handoff` (K1). It does not claim deployed behavior, STEP-backed part geometry, a routed harness, completed enclosure cut operations, or physical/hardware acceptance.

- Input fixture: [handoff-drawbot.json](../../../tests/fixtures/argon/handoff-drawbot.json), schema `labwired-kernelcad-handoff/0.1`.
- Context: the fixture describes seven handoff part records, 24 wires, layout positions for board-mounted parts, two off-board motors, and a DC jack with no bbox.
- Invocation: `importHandoffTool({ handoff: JSON.parse(readFileSync(fixturePath, 'utf8')) })`.
- Result: [result.json](./result.json) records seven handoff parts, six bbox placeholder solids, fastened mate intent for wires with known endpoints, cutout hints from connector faces, and warnings for null or estimated data. [drawbot.kcad.ts](./drawbot.kcad.ts) is the generated assembly source; its capture dry-run succeeds with six named parts.
- Verification: `npx vitest run --configLoader runner tests/unit/mcp/tools/importHandoff.test.ts`.
- MP4 creation: `rsvg-convert -o /tmp/import-handoff-demo/card.png /tmp/import-handoff-demo/card.svg`, then `ffmpeg -loop 1 -i /tmp/import-handoff-demo/card.png -t 8 -r 24 -c:v libx264 -crf 24 -pix_fmt yuv420p -movflags +faststart -an docs/demos/import-handoff/demo.mp4`; full decode checked with `ffmpeg -i docs/demos/import-handoff/demo.mp4 -f null -`.

The generated solids are bbox placeholders. Handoff coordinates and rotations are used as supplied; unknown/null positions fall back to the origin with a warning. Connector-face cutout hints remain descriptive data and do not create enclosure walls or cut features.
