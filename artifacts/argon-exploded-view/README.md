# Argon exploded-view demo bundle

This bundle demonstrates the handoff-driven order and per-part animation tracks from `explode_view`.

- Source: `drawbot-exploded.kcad.ts`
- Input: `../../tests/fixtures/argon/handoff-drawbot.json`
- Invocation/settings: see `plan.json` and `capture.json`
- Video: `explode-plan.mp4`, rendered from the recorded planner output by `render-plan-demo.py` + ffmpeg
- Verification evidence: `plan.json` records the handoff-derived order, offsets, tracks, camera plan and warnings. `capture.json` records the separate `capture_animation` environment failure.

The MP4 is a schematic visualization of the actual plan values, not a CAD render. The `.kcad.ts` source is retained for a `capture_animation` run, but that run was blocked because the sandbox refused a local render-server socket (`EPERM`). The animation uses estimated bbox proxies, skips collision verification, has a fixed camera, and is not simulation evidence, deployed behavior, hardware fit validation, or hardware acceptance. `explode_view.cameraPlan` is framing guidance because `animationView` / `capture_animation` do not animate camera tracks.
