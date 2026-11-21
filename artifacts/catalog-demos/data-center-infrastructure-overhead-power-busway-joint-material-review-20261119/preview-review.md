# Five-preview semantic audit — 19 November 2026

## Selection and exclusions

Reviewed the current rendered previews for five data-center electrical assets: `dry-type-transformer`, `modular-ups-cabinet`, `switchgear-lineup`, `overhead-power-busway`, and `rack-power-distribution-unit`. These source paths are absent from the active catalog PR #1507 diff, and searches for each ID returned no open issue or PR. PR #1258 was checked first; it is merged and its CI checks passed. The five previews and matching source snapshots are retained under `samples/`.

## Ledger

| Asset | Preview observation | Result |
|---|---|---|
| `dry-type-transformer` | Rolling cast-resin transformer assembly reads clearly, with coils, clamp frame, copper links and insulators visible in distinct colors. | No supported material mismatch selected. |
| `modular-ups-cabinet` | Floor cabinet reads as a UPS; repeated front power modules, display, handle and controls are visible. | No supported material mismatch selected. |
| `switchgear-lineup` | Four joined switchgear bays read as a lineup, with repeated doors and selector controls. | No supported material mismatch selected. |
| `overhead-power-busway` | The four same-size joint covers repeat on one steel busway housing. Three use the housing's steel color; the first cover alone is gold. | Selected: map all four repeated sheet-steel joint covers through one joint-cover steel control. |
| `rack-power-distribution-unit` | Vertical steel channel, repeated outlet sockets, mounting tabs and dark feed cable read clearly. | No supported material mismatch selected. |

## Correction

The default preview assigned `cover-joint-0` to `polymer` while `cover-joint-1` through `cover-joint-3` used steel. The source now gives all four covers a shared `jointCoverSteel` control, with a matching steel default. `housingSteel` remains separate so the housing/fittings and joint-cover finish can be edited independently. Geometry, bounds, 140-triangle mesh and the 2,200-triangle budget are unchanged.

## Verification and scope

- The exported-GLB regression fails on the retained baseline source at `cover-joint-0`; it passes after the correction (1/1), with all four cover nodes using the shared default steel color.
- ESLint is clean. The data-center kit quality gate passes 50/50 (100%). The global structural gate reports 2,398/2,402 (99.83%); its four one-color exceptions are `standard-components/din-rail`, `hose-barb-adapter`, `retaining-ring`, and `beam-coupling`. This round changes none of those sources.
- The full catalog integration suite passes 162 files / 232 tests with `--maxWorkers=2`, including the full index/export freshness check. The initial default-parallel run hit the 300-second timeout in `catalogFreshShapes.test.ts` under load; that incomplete run was terminated by PID, and the lower-concurrency full rerun passed the check in 49 seconds.
- The generated index source SHA matches the edited source; the target preview path exists; only the target index row changed; its triangle count and bounds match the before row.
- Hosted kernelCAD produced the solid with unchanged bounds and volume, but its assembly checker reports three interpenetrations. The same diagnostics and metrics reproduce on the baseline source, so they predate this material-only correction; the comparison is recorded in `verification/hosted-kernelcad-build.md`.

The MP4 and verification logs are retained under `verification/` and `video-review/`.

The MP4 documents local source, software-rendered catalog previews and the GLB color regression. It does not claim simulation, deployment, electrical performance, installation suitability, compliance or hardware acceptance. The change is not deployed, so no post-deployment page check is claimed.
