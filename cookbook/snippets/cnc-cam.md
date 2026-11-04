---
id: cnc-cam
title: Plan 2.5D mill toolpaths from a solid and a plate
tags: [manufacturing, gcode, plate, pocket]
keywords:
  - plan_cnc_toolpaths facing profile pocket drill
  - mill G-code G21 G90 separate from FDM slicer
  - plate stock end mill stepdown
  - stock corner origin bbox heuristic
  - peck drill cycle on a hole list
when_to_use: >-
  You have a parametric solid and a plate, blank, or bar and need a 2.5D mill
  plan. plan_cnc_toolpaths seats the bounding box in the stock and can return
  mill G-code. It is not the FDM slicer export, and it is not collision-checked.
---

```typescript
// 40 x 30 x 10 mm block. The mill plan is not this script.
// plan_cnc_toolpaths measures the bounding box, centers it in a
// plate 50 x 40 x 15 mm, and seats it on Z=0. The machine origin
// is the stock's minimum corner.
// Facing clears from the stock top down to the part top.
// Profile walks a rectangle offset by the tool radius.
// Pass include_gcode for mill G21/G90 output. That is not the
// FDM slicer export.
return box(40, 30, 10);
```

`plan_cnc_toolpaths` refuses a missing stock, a blank smaller than the part,
filament, and a non-positive tool diameter. Pocket defaults to clearing the
part footprint down to Z=0 unless a floor is set. Drill holes are
`{ x_mm, y_mm, depth_mm }` in the stock-corner frame. Feeds are labelled
heuristics. The removed-volume number is a proxy.
