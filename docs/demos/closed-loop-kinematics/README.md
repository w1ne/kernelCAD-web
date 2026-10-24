# Closed-loop kinematics (four-bar contact, over-center latch flip)

`demo.mp4` (16.8 s, 12 fps) is a pose-by-pose sweep built from local
`kernelcad render --preset publish --pose 30,20` captures. It is **local
capture evidence, not deployed behaviour**: no Studio, no hosted service and no
hardware were involved. Each frame is the real kernel output. The script drives
one joint through `solvedModel(...)`, the loop solver in the OCCT lowering step
poses the other links, and the scene is then meshed and rendered.

Sources (the geometry is committed, so the demo shows the scripts as they are):

- `examples/kinematic/four-bar-swept.kcad.ts`: four-bar with crank 40,
  coupler 120, rocker 80 and ground 100 mm, built on a base plate with posts and
  pins at both ground pivots and pins at the two moving joints. Only the crank is
  driven. A stop block stands in the rocker's layer beside the rocker pivot. The
  example's `checkSweptCollision` (0–200°, 2° step) reports the first contact,
  rocker vs stop, at crank = 164°. A separating-axis closed form on the rocker
  angle gives the same 164°.
- `src/agent/skills/kernelcad-kinematic/cookbook/06-over-center-latch-reachable.kcad.ts`:
  slider-crank draw latch with handle 30, link 100 and keeper offset 10 mm. A
  post and pin on the housing carry the handle, and pins join handle–link and
  link–keeper. The latched side is pinned with
  `loopMode('latch', { joint: 'link', sign })`. The cookbook's sweep stops at
  handle = 6° with `kinematic.loop.branch-flip`; the closed-form over-center
  angle is asin(10/130) = 4.41°.

Video timeline: title card (2 s); four-bar crank 0° → 160° in 4° steps, then
164° (41 poses, two video frames each); a 2 s hold on the 164° contact; latch
handle −20° → 4° in 1° steps (25 poses); a 2 s hold on 4°.

## Capture

From the repository root:

```sh
npm run build:player   # dist/headless-player; playwright chromium-headless-shell 1208
python3 docs/demos/closed-loop-kinematics/make-frames.py /tmp/s4-demo
for f in /tmp/s4-demo/*.kcad.ts; do   # re-run any frame that comes back empty
  npx tsx src/agent/cli/index.ts render "$f" --preset publish --pose 30,20 \
    --width 960 --height 640 --no-watermark -o "${f%.kcad.ts}.png"
done
python3 docs/demos/closed-loop-kinematics/make-video.py /tmp/s4-demo
```

`make-frames.py` copies the model section of the two sources and adds display
colours: crank/handle orange, coupler/link blue, rocker/keeper green, stop dark
slate, ground grey. On the contact frame the contacting pair (rocker and stop)
is drawn red. A pale backboard behind the mechanism keeps the auto-framing the
same in every frame. Each frame script returns
`solvedModel({ crank | handle: X }, { validate: 'off' })`.

## Capture evidence

- Date: 2026-10-24, local Linux machine with the bundled static player and
  chromium-headless-shell 1208.
- Source: branch `feat/verified-intent-s4-closed-loop-kinematics`. The example
  and cookbook geometry in this commit are the ones rendered; both re-ran OK
  (four-bar: sweep 164° = closed form 164°; latch: flip between 4° and 6°).
- `demo.mp4`: H.264, 1280×720, 12 fps, 16.8 s (202 frames), 118 975 bytes,
  sha256 `c57f15bc3a0ce740a112eea71e463ae0034ba07ac28d79a398db610e874774e2`.
- Render rate: 67 pose renders. 3 came back empty on the first try (crank 0°,
  88° and 164°) and rendered correctly on the second. Every frame used was
  checked for content (minimum mean brightness 240 of 255) before the video was
  built. The empty captures come from the headless renderer, not from the
  kinematics.

## What the frames show (inspected at 4 s, 8.5 s, 10 s, 13.5 s and 16 s)

- 4 s, crank = 48°: 3/4 view of the base plate with its two posts. The orange
  crank turns on the front post's pin; the blue coupler joins it by a pin and
  runs to the green rocker, which turns on the rear post. The dark stop stands
  between the posts. The rocker is well clear of it, and the coupler passes high
  above it in a nearer layer.
- 8.5 s, crank = 156°: the rocker has leaned left toward the stop, a few
  millimetres short of it. The coupler and crank are far from the stop.
- 10 s, contact hold at crank = 164°: rocker and stop are both drawn red. The
  rocker's lower body rests on the stop's top corner, and no other link is near
  the stop. Caption: the swept-collision check and the closed form both give
  164°.
- 13.5 s, latch at handle = −4°: post and pin on the housing carry the orange
  handle. Pins join handle–link and link–keeper. The elbow between handle and
  link is bent slightly downward (the latched side).
- 16 s, flip hold at handle = 4°: handle and link are almost in line, the last
  pose on the pinned side. Caption: at 6° the sweep stops with
  `kinematic.loop.branch-flip`, against a closed form of 4.41°.

## Scope

- Discrete poses (4° steps for the four-bar, 1° for the latch), not an
  interpolated animation. The positions are the solver output for those driven
  values.
- The 6° flip pose is not shown, because the sweep stops there by design.
- The latch keeper's slide guide is not modeled: the keeper is drawn without a
  rail. Its motion along the slide is still the solved prismatic mate.
