# Issue #1269 scissor jack demo

This bundle demonstrates the repaired true closed-loop kinematic cookbook in
`src/agent/skills/kernelcad-kinematic/cookbook/04-scissor-jack-swept.kcad.ts`.
`scissor-jack-demo.kcad.ts` is a capture wrapper using the same six parts,
connectors, mates, geometry, limits, and rest slider poses. It exposes the lift
angle as an animation parameter and passes it as the explicit loop driver. It
omits the source script's inline sweep so the capture stays short. Display
colors distinguish the bars, frame, and sliders in the review footage. The
integration test evaluates the actual cookbook and its full sweep.

## Files

- `scissor-jack-demo.mp4` — 2 second, 1920×1080, 24 fps lift animation.
- `video-contact-sheet.png` — five extracted timeline frames showing the travel.
- `start-end-review.png` — full-size start/end frame comparison.
- `representative-frame.png` — extracted from the MP4 at the midpoint.
- `inspect/channels/rgb/iso.png` — 640×480 isometric inspection render.
- `inspect/manifest.json` — render settings and model bounds.
- `capture-report.json` — animation capture and pose verification result.
- `verification.txt` — focused unit and integration test output.
- `scissor-jack-demo.kcad.ts` — capture wrapper source.

## Reproduction

The project CLI and static player were built with `npm run build:cli` and
`npm run build:player`. The documented Playwright Chromium runtime was installed
under `/Volumes/LabWired/.cache/playwright-kernelcad` for this local capture.

```sh
PLAYWRIGHT_BROWSERS_PATH=/Volumes/LabWired/.cache/playwright-kernelcad \
  node dist/cli/index.js animate \
  artifacts/issue-1269-demo/scissor-jack-demo.kcad.ts \
  artifacts/issue-1269-demo/scissor-jack-demo.mp4 \
  --fps 24 --pose 35,25 --lock-frame --backdrop white \
  --verify-every 12 --json

PLAYWRIGHT_BROWSERS_PATH=/Volumes/LabWired/.cache/playwright-kernelcad \
  node dist/cli/index.js render inspect \
  artifacts/issue-1269-demo/scissor-jack-demo.kcad.ts \
  artifacts/issue-1269-demo/inspect \
  --channels rgb --views iso --width 640 --height 480 --environment neutral
```

The rendered frame shows the crossed bars separated by the shared pin plane,
with each rail clear of the linkage through the captured lift. The source
cookbook's integration test separately verifies `mechanism=real`, no listed
joint/connector/loop/interference defects, and all 46 1-degree samples from 15°
to 60°.

## Evidence scope

The MP4 is a local kinematic replay, not a physics simulation. Closed-loop
MuJoCo acceptance is outside this fix (#1271). This branch was not pushed, so
the deployed public example page has not been updated or verified. No hardware
acceptance is claimed.
