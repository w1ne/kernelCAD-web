# Five-preview semantic audit — 2026-11-11

PR #1258 was green at head `f7fc9da31` before this review; its review list was empty. Open issues and PRs #1215, #1258, #1279, #1308 and #1323 were checked by title/body and relevant changed-file lists. None of the five IDs below is targeted by open work. The already noted fixes on #1298, #1305, #1307 and #1308 were not duplicated. The 2026-11-10 industrial-plant ledger had already flagged `bucket-elevator` but deferred it; no open issue or PR owns that correction. The other four assets are new checks for this ledger.

The live `assets.json` generated at `2026-11-11T02:39:30.846Z` contains all five existing asset IDs and preview paths. The live `bucket-elevator` source and PNG hashes match the local pre-edit source and preview; that defect is present in the current site version. Full reviewed source and preview hashes are in `verification/hashes.txt`.

| Rendered asset | Preview observation | Decision |
| --- | --- | --- |
| `industrial-plant/bucket-elevator` | Six yellow bucket blocks sat outside the solid casing; no enclosed belt or bucket loop was visible. | **Fixed:** move the bucket loop inside the casing and show it through a framed front inspection opening. Six open bucket cups now attach to the rising belt strand. |
| `industrial-plant/axial-flow-fan` | The axial hub, radial blades, surrounding support and base communicate an axial fan. | Leave unchanged. |
| `industrial-plant/bridge-crane` | Runway columns/beams, twin bridge girders, trolley, hoist drum, rope and hook read as a bridge crane. | Leave unchanged. |
| `industrial-plant/packed-scrubber-column` | The tall vessel, upper head, side connection, packing zones and service platforms read as a packed scrubber. | Leave unchanged. |
| `industrial-plant/vertical-storage-tank` | The upright cylindrical shell, roof closure, side ladder and foundation feet read as a storage tank. | Leave unchanged. |

The contact sheet and all five before previews/sources are retained in this bundle. The after preview and before/after source snapshots cover only the bucket elevator. Official product and CAD workflow comparisons are dated and stored privately in `kernelCAD-private/docs/competitors/2026-11-11-industrial-plant-bucket-elevator-semantic-review.md`.

This is a semantic scene-asset correction. It does not establish vendor fidelity, dust-tightness, conveying capacity, equipment safety, physical acceptance, or deployment.
