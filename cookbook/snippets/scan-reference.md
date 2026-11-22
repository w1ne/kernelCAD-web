---
id: scan-reference
title: Fit a parametric solid to a scanned envelope
tags: [scan]
keywords:
  - load_scan_reference PLY XYZ point cloud
  - fit_model_to_scan clearance translate scale
  - phone LiDAR measured envelope
  - non-solid scan reference
  - per-axis slack inside a scan
when_to_use: >-
  You have a phone LiDAR, ASCII PLY, or XYZ point cloud of a measured envelope
  and need a parametric solid checked against that envelope. load_scan_reference
  keeps the cloud as a non-solid reference. fit_model_to_scan reports
  translation, scale, and per-axis clearance. Studio does not draw the cloud.
---

```typescript
// The cloud is a reference, not a solid. load_scan_reference reads the PLY
// or XYZ file. fit_model_to_scan compares this box with the scan bbox.
// clearance_mm is scan size minus model size on each axis.
// Apply scale.uniform about the model center, then translate_mm.
return box(10, 20, 30);
```

Studio does not draw a points overlay for the cloud. The fit numbers from
`fit_model_to_scan` are the result. Booleans on the scan are refused.
