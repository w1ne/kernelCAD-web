# Recycling facility preview audit — 18 November 2026

The five rendered previews were selected after checking the open catalog issues
and PR paths for overlap. None of these five asset IDs is targeted by an open
issue or PR; the current open PR #1507 does not modify this kit. PR #1258 is
merged and its reported CI checks are green.

| Asset | Rendered preview review | Result |
| --- | --- | --- |
| `bale-ejector` | Press chamber, hydraulic ejector, bale and roller table are distinct and legible. | No material mismatch found. |
| `belt-conveyor-head` | Belt, head guard, drive and service walkway read as a conveyor head assembly. | No material mismatch found. |
| `biofilter-bed` | Media bed, frame, feed vessels and pump remain distinguishable. | No material mismatch found. |
| `glass-breaker-screen` | Infeed, hooded breaker, screen deck, cullet bin and reject cage form a recognizable process line. The thumbnail alone does not expose the rotor finish clearly. | **Selected:** the 16 flail parts were hard-coded charcoal although the `wearSteel` control and palette explicitly cover rotor, flails and mesh. |
| `mobile-compactor` | Hopper, compaction ram, controls and container body read as a mobile waste compactor. | No material mismatch found. |

The selected defect was confirmed by tracing named assembly parts through the
exported GLB palette. The prior preview-only pass had marked the full silhouette
plausible; it did not catch the hidden rotor's control-mapping inconsistency.
The correction changes only the 16 flail assignments from the hard-coded dark
finish to the existing `wearSteel` control. Geometry, material controls,
presets, asset ID and triangle budget are unchanged.

## Evidence and limits

- The standard before/after previews use the same catalog preview renderer and
  camera. The isolated rotor comparison is rebuilt from the retained before and
  after source with the same software-rendered view, so the formerly charcoal
  flails are visible against the rotor discs and shaft.
- The before source fails the new exported-GLB regression; the corrected source
  passes it. The regression checks all 16 flail nodes, palette membership,
  exported colors, unchanged triangle count and the existing budget.
- The site's current page and asset files were checked as the pre-change public
  baseline. The branch is not deployed, so the audit does not claim post-deploy
  verification. It also does not claim process simulation or hardware
  acceptance.
- The required `kernelcad render inspect` command was attempted against both
  already-running Chrome sessions, but Playwright timed out during CDP
  attachment. No additional browser was started. The CLI timeout logs are in
  `verification/render-inspect-cdp-attempts.txt`; this bundle instead retains
  the successful catalog renders and deterministic GLB close-view generation.
