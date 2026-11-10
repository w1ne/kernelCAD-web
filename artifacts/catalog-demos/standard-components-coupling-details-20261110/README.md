# Standard component detail refinement demo

This bundle documents an in-place refinement of three existing standard-components assets: `flange-bearing-housing`, `jaw-coupling`, and `pipe-union`. No IDs or kits were added.

## What changed

- **Flange bearing housing:** cast iron body, visible steel race and rubber lip seal; compact/standard/large sizes; factory, weathered and high-visibility presets; 500-triangle budget.
- **Jaw coupling:** bored steel hubs with offset jaws, a three-lobe polymer spider and visible set screws; compact/standard/large sizes; dark, high-torque and weathered presets; 640-triangle budget.
- **Pipe union:** hollow steel sockets, an extruded six-flat brass nut and a separate rubber joint seal; compact/standard/large sizes; dark, brass and weathered presets; 440-triangle budget.

Each model exposes three material-named color controls plus a size control, adding one material control per asset. The preset count remains three per asset (nine total); the refinement adds the `factory`, `highVisibility` and `highTorque` named variants while updating the schemes. The nine rendered variants and their source/settings hashes are listed in `variant-manifest.json`.

## Reproduce and review

`demo-settings.json` records source IDs, invocations, canvas settings and claim limits. The before sources/previews are retained under `before/`; updated source copies, variants and checksums are in this directory. `verification.json` records source/index/preview hashes and the required check results. `local-page-check.json` records the local generated catalog page check.

The capture uses only checked-in source geometry and local rendered output:

- [MP4 workflow demo](standard-components-coupling-details.mp4)
- [Video contact sheet](video-review/decoded-samples.png)
- [Video inspection record](video-inspection.json)
- [Verification summary](verification-summary.txt)

The video is a local software-rendered workflow demonstration. It does not establish vendor dimensions, manufacturing suitability, physical acceptance, or deployed behavior. The affected local catalog pages were generated and checked in this worktree; the feature branch has not been deployed, so the public page still needs checking after deployment.

## Dated workflow comparison

Current official catalog/configuration workflows were checked on 2026-11-10. The comparison notes are kept privately in `kernelCAD-private/docs/competitors/2026-11-10-standard-components-quality.md`; the public handoff describes only native kernelCAD source behavior.
