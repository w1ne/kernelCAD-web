# Space exploration catalog wave demo

[Watch the original 30-second local workflow demo](space-exploration-kit.mp4)

This MP4 is historical evidence from the kit's initial wave, before the
2026-11-05 material and silhouette promotion. It shows the original
single-color `lunar-habitat-module.kcad.ts` source and the then-current preview
set. The [quality promotion handoff](../space-exploration-quality-promotion-20261105/README.md)
documents the current sources and refreshed previews. The generator retained
here has since been updated to reproduce the promoted sources; replaying it does
not recreate the original single-color state.

## Rebuild and verify

Use the current [quality promotion handoff](../space-exploration-quality-promotion-20261105/README.md)
for the generator, preview/index invocation and validation sequence. The
historical evidence files in this wave bundle are unchanged.

## Website status and limits

The local static page builder is checked separately from the deployed website. On 2026-11-03 the public homepage status and `/catalog/` route were checked; live catalog behavior remains unverified until deployment.

All assets are original CC0 1.0 kernelCAD geometry. These are stylized scene props; they make no claims about launch, pressure-vessel, radiation, thermal-vacuum, mobility or mission performance.

## Untracked generated outputs

`frames/` and the decoded images and contact sheets in `video-review/` are not tracked in git; they are regenerated from the files in this bundle:

- frames and MP4: `python3 artifacts/catalog-demos/space-exploration-wave-20261103/capture_space_demo.py`
- video review: `python3 artifacts/catalog-demos/space-exploration-wave-20261103/inspect_space_video.py`

Run from the repository root; each script header lists the inputs it needs. Regenerated files are git-ignored. Rerunning the capture script also re-encodes the MP4.
