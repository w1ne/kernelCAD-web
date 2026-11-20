# Suggested joint stop on the clear side of a wall

`joint-range-suggestion.mp4` is a local kinematic replay of
`examples/kinematic/joint-range-suggestion-motion.kcad.ts`. The orange
carriage slides along the grey rail toward the blue wall. The script calls
`kinematic.suggestJointRanges` once, at capture time, and the timeline ends
at the reported stop. Nothing writes that stop back onto the mate.

The analytic gap at slide 0 is 10 mm (`wallX 40 − rail face 10 − carriage
length 20`). A 0.3 mm clearance is slide 9.7. This capture reports
`9.693750000000001` mm, pair `carriage` / `wall`, resolution
`0.02656250000000071` mm. That pose is the clear side of the bracket. The
faces meet at slide 10, which this timeline does not reach.

The mate limits in the motion script are `[0.1, 9.8]`, wide enough to include
the stop and short of solid overlap. The short example
`examples/kinematic/joint-range-suggestion.kcad.ts` keeps authored limits
`[0.1, 8]` and only prints the suggestion.

This is a sampled clearance walk plus a renderer capture of that one
timeline. It is not a physics simulation, not hardware acceptance, and not a
deployed page.

## What the frames show

Inspected 1920×1080 frames from the MP4 (24 frames, 12 fps, 2.000 s, h264):

- `frames/pose-01.png` — start, slide 0.1. The orange carriage sits on the
  grey rail with a wide gap to the blue wall.
- `frames/pose-02.png` — middle of the timeline. The whole carriage has moved
  toward the wall: its rear face has left the rail and a gap to the wall
  remains.
- `frames/pose-03.png` — last frame, slide at the reported stop. The carriage
  has the same length as in the first frame. Its rear face is clear of the
  rail and its front face is short of the wall. A hairline of background shows between the
  orange face and the blue face. The solids do not overlap.

Pose verification of the timeline (start, midpoint, end) reported clean:
`ok: true`, `verified: true`, `collisions: []`.

## Reproduce

```sh
node scripts/build-cli.mjs
npm run build:player
PW_CDP_URL=http://127.0.0.1:1 \
node dist/cli/index.js animate \
  examples/kinematic/joint-range-suggestion-motion.kcad.ts \
  docs/demos/joint-range-suggestion/joint-range-suggestion.mp4 \
  --fps 12 --pose 0,8 --lock-frame --backdrop white --json
```

Capture on 2026-11-20 used the headless player at `dist/headless-player`
(`npm run build:player`, vite `vite.player.config.ts`). No studio server.
`PW_CDP_URL` points at a closed port so the CLI starts its own Chromium.
Camera: `setCameraTarget(36, 12, 10)`, `setCameraDistance(48)`, CLI pose
`0,8`, `--lock-frame`, backdrop white. Timeline frames are 1920×1080.
Wall time of that animate command was 344.69 s on a loaded machine.

## Recapture on 2026-11-20

The capture of 2026-11-17 was wrong. It showed the carriage twice: one copy
fixed at slide 0.1 and one copy at the current slide, so the carriage looked
stretched from the rail to the wall. `kinematic.suggestJointRanges` left its
probe scene in the model, and the capture drew that scene too. The query now
removes its probe scene. The script, the camera and the reported stop are
unchanged. In the new frames one carriage moves, and the rail is visible
behind it at the middle and last poses.

Settings are also in `capture-settings.json`.
