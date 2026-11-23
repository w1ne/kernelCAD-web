# Hosted kernelCAD evaluation

The authored source was checked with kernelCAD 0.17.4 using the hosted OCCT
evaluator. The dry run parsed the source with no diagnostics and found nine parts.
The full build produced the solid, with 51 faces, volume 109,857,260.163 mm³,
and bounds 2,510 × 560 × 530 mm. Its overall status is `ok: false` because the
assembly checker reports three `mechanism.interpenetration` errors.

The same full evaluation was run against the pre-edit source. It produced the
same volume, face count, bounds, and all three diagnostics: both end caps overlap
the busway housing, and the hanger bolt overlaps the hanger. The material edit
does not change geometry, so these assembly findings predate this correction.
They remain unresolved and this review does not claim an assembly-validation
pass. Local catalog rendering, GLB material regression, index checks, lint,
quality scan, and catalog integration results are recorded separately.

| Source | SHA-256 | Build | Scene summary | Assembly diagnostics |
|---|---|---|---|---|
| Before | `4a301e802883fa8bcbd889cedb4e77db6443808f7c1b99629f3ef2efa5c00973` | Solid built; overall `ok: false` | 51 faces; 109,857,260.163 mm³; 2510 × 560 × 530 mm | 3 `mechanism.interpenetration` |
| After | `75e57a498475868e00725d4d70edcf868aa7f923927980641d39f0088c74e68b` | Solid built; overall `ok: false` | 51 faces; 109,857,260.163 mm³; 2510 × 560 × 530 mm | Same 3 `mechanism.interpenetration` |

The hosted evaluator could not produce step snapshots because it had no browser
attachment. The before/after images in this bundle are the repository's rendered
catalog previews.
