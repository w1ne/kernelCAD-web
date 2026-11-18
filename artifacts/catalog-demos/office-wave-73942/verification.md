# Office wave verification

Date: 2026-11-02
Branch: `feat/catalog-wave-73942`
Base: `origin/develop`

## Catalog source and outputs

- Added 40 standalone `catalog/kits/office/<id>.kcad.ts` models. Each uses `meta()` with `CC0-1.0`, a `base` origin, a triangle budget, and labelled format/color parameters. Count parameters are choice parameters.
- Added `catalog/kits/office/kit.json` and the kit README.
- Final per-asset check output is retained in `catalog-checks.log`: `RESULT passed=40 failed=0 total=40`. Each report showed `minUpM: 0` and `materials: 1`; all default triangle counts are at or below their budgets.
- `npm run catalog:build` completed with: `wrote /home/andrii/worktrees/kernelCAD-web/catalog-wave-73942/catalog/index.json`.
- `npm run catalog:previews` completed successfully. The generated index contains 413 assets in 12 kits, including 40 office assets; all 413 kit preview PNGs are present.
- The run regenerated some existing kit previews. Those unrelated generated changes were restored; the 40 new office previews remain in this branch.

## Integration gate

Command:

```sh
npx vitest run tests/integration/catalog/catalogIndex.test.ts
```

Final result:

```text
✓ tests/integration/catalog/catalogIndex.test.ts (2 tests) 54352ms
  ✓ every catalog source builds, exports inside its triangle budget on one material, and the committed index is fresh  54110ms

Test Files  1 passed (1)
Tests       2 passed (2)
Start       02:14:45
Duration    57.78s
```

`npm run catalog:pages` also completed locally with `wrote 413 asset page(s) + hub, sitemap.xml and robots.txt to /home/andrii/worktrees/kernelCAD-web/catalog-wave-73942/site-build`. The office hub section and `catalog/office/desk-organizer/` page were present and had the expected title. This is a local generated-page check; it is not a deployed-page check.

## Visual and demo inspection

- Opened four contact sheets covering all 40 generated previews, then reopened the changed calculator, desk calendar, tape dispenser and mechanical pencil previews. The boards stand upright; the stationery, desk devices and support accessories read as separate low-poly objects. The calculator keys now fit within its case, the calendar has a centered base, the tape roll is centered, the pencil cup holds its pencils, and the scissors' rectangular handles connect to the blades.
- Captured the MP4 in the already-running Chrome 156 CDP session. The helper created a temporary local tab and closed it; the existing browser stayed open, and a follow-up CDP check found zero local pages remaining.
- Inspected six frames extracted from the final MP4. They show the kit overview, the workflow/evidence slide, and each of four 10-asset preview grids. The slides are readable and no longer repeat the intro frame.
- `ffprobe` reports H.264, 1280×720, 24 fps, 24 seconds, 308328 bytes. The video is local preview replay, not an interactive Studio recording.

## State distinctions

- Replay: recorded presentation of generated local preview images.
- Simulation: not run.
- Local validation: passed as listed above.
- Deployment: not verified; the branch is still a PR and has not been merged or deployed.
- Hardware acceptance: not applicable; no physical hardware was produced.

The current kernelCAD homepage was checked before implementation on 2026-11-02. A live baseline request to `https://kernelcad.com/catalog/` returned HTTP 404 on 2026-11-02. The PR is unmerged, so this wave has not been deployed and its public page cannot yet be verified; no deployment is claimed here.
