# ISO fastener lineup, local render

Source: `examples/parts/fastener-lineup.kcad.ts`.

The center stack is an ISO 4014 M6×30 hexagon head bolt (`boltHexPartial`),
an ISO 4032 M6 nut, and two ISO 7089 M6 washers. The solids are envelope
detail: nominal table geometry. The modeled thread is not drawn. The nut
sits on the threaded end (18 mm from the tip) and the head washer sits on
the plain shank under the bearing face.

This MP4 is a local `render inspect` sequence of those views. It is not a
replay, a simulation, a deployed-studio capture, or a hardware acceptance.

```
PLAYWRIGHT_BROWSERS_PATH=/Volumes/LabWired/.cache/playwright-kernelcad \
  npx tsx src/agent/cli/index.ts render inspect \
  examples/parts/fastener-lineup.kcad.ts artifacts/fastener-iso4014-inspect \
  --width 768 --height 768 --no-watermark --views front,right,top,iso

PLAYWRIGHT_BROWSERS_PATH=/Volumes/LabWired/.cache/playwright-kernelcad \
  npx tsx src/agent/cli/index.ts render inspect \
  examples/parts/fastener-lineup.kcad.ts artifacts/fastener-iso4014-stack \
  --width 768 --height 768 --no-watermark --views front,iso \
  --focus iso-4014-bolt,iso-4032-nut,iso-7089-tail-washer,iso-7089-head-washer
```

`lineup-local-validation.mp4` holds those six frames for about 11 seconds
(front, right, top, iso, then the focused stack front and iso). Captured
2026-11-17 with the static player in `dist/headless-player` and Playwright
Chromium revision 1208. No Chrome debugging port was open, so the user's
browser was left running and was not attached.
