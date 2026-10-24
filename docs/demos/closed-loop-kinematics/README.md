# Closed-loop kinematics (four-bar contact, over-center latch flip)

`demo.mp4` (23.6 s) is a captioned still sequence made from local
`kernelcad render --preset publish --pose 0,0` captures of posed frames. It is
**local capture evidence, not deployed behaviour**: no Studio, no hosted
service and no hardware were involved. Each frame is the real kernel output:
the script drives one joint through `solvedModel(...)`, and the OCCT lowerer's
loop solver poses the other links before the scene is meshed and rendered.

Sources:

- `examples/kinematic/four-bar-swept.kcad.ts`: four-bar with crank 40,
  coupler 120, rocker 80 and ground 100 mm. Only the crank is driven.
  Frames are at crank 0, 30, 60, 90, 120, 150, 165 and 174°. The example's
  `checkSweptCollision` (0–300°, 2° step) finds the first contact
  (rocker vs stop) at 174°, the same angle the closed form gives.
- `src/agent/skills/kernelcad-kinematic/cookbook/06-over-center-latch-reachable.kcad.ts`:
  slider-crank draw latch with handle 30, link 100 and keeper offset 10 mm.
  The latched side is pinned with `loopMode('latch', { joint: 'link', sign })`.
  Frames are at handle −20 (as modeled), −12, −6, 0 and 4°. The cookbook's
  sweep stops at handle = 6° with `kinematic.loop.branch-flip`; the closed-form
  over-center angle is asin(10/130) = 4.41°.

## Capture

From the repository root:

```sh
npm run build:player   # dist/headless-player; playwright chromium-headless-shell 1208
python3 docs/demos/closed-loop-kinematics/make-frames.py /tmp/s4-demo
for f in /tmp/s4-demo/*.kcad.ts; do
  npx tsx src/agent/cli/index.ts render "$f" --preset publish --pose 0,0 \
    --width 960 --height 640 --no-watermark -o "${f%.kcad.ts}.png"
done
python3 docs/demos/closed-loop-kinematics/make-video.py /tmp/s4-demo
```

`make-frames.py` copies the model section of the two sources, adds display
colours (crank/handle orange, coupler/link blue, rocker/keeper green, stop red,
ground grey) and a pale backboard behind the mechanism so every frame
auto-frames the same, then returns `solvedModel({ crank | handle: X }, { validate: 'off' })`.

## Capture evidence

- Date: 2026-10-24, local Linux machine with the bundled static player and
  chromium-headless-shell 1208.
- Source commit: `4e0ab1a5` on `feat/verified-intent-s4-closed-loop-kinematics`.
  The bundle is committed on top of it.
- `demo.mp4`: H.264, 1280×720, 10 fps, 23.6 s, 101 234 bytes, sha256
  `9033c839f2bb410b21f24f1998e3af83f291d84454e97a91b39a50dfc05228c5`.
- Render rate: 6 of the 13 frame renders first came back fully black (mean
  brightness 0). Re-running the same command (once, or twice for one frame) fixed each one, and all 13 frames
  in the video were checked for non-black content before the video was built.
  The intermittent black capture comes from the headless renderer, not from
  the kinematics.

## What the frames show (inspected at 0.5 s, 3 s, 7 s, 12.5 s, 15 s and 22 s)

- 0.5 s: title card, "Closed-loop kinematics", with the local-capture note.
- 3 s, crank = 0°: the orange crank lies along +X from its ground pivot and the
  blue coupler rises to the green rocker. The coupler and rocker tips meet at
  one pin, so the loop is closed. The red stop is clear of every link.
- 7 s, crank = 90°: the crank is vertical and the coupler runs from its tip to
  the rocker tip, which has swung left. The loop is still closed.
- 12.5 s, crank = 174°: the green rocker's tip reaches the red stop's right
  face, at the first-contact angle that the sweep and the closed form both
  report. The blue coupler also crosses the stop in this front view, but it
  sits in a different depth layer (y = 24 mm vs 36 mm). It does not touch the
  stop, and the sweep reports rocker ↔ stop only.
- 15 s, handle = −20°: the orange handle tilts down to the right and the blue
  link runs up to the green keeper. The elbow between handle and link is
  clearly bent: this is the latched side.
- 22 s, handle = 4°: handle and link are almost in line, just short of
  straight. This is the last pose on the pinned side. The caption states that
  the sweep stops at 6° with `kinematic.loop.branch-flip`, against the closed
  form of 4.41°.

## Scope

Stills, not continuous motion. The positions match the solver output for the
listed driven values. The video does not show the 6° flip pose itself, because
the sweep stops there by design.
