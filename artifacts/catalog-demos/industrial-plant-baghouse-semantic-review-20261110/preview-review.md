# Industrial-plant semantic preview audit — 2026-11-10

Scope: five rendered manufacturing/industrial previews not targeted by an open issue or PR at audit time. The current open #1215 industrial-plant wave and feature #1258 diff were checked before selection; the five IDs below did not overlap those changes. Existing fixes #1298, #1305, #1307, and #1308 were excluded. The pre-edit public source and preview bytes for all five matched the local pre-edit snapshot; hashes are in `hashes.json`.

| Asset | Preview observation | Decision |
| --- | --- | --- |
| `baghouse-dust-collector` | Six filter tubes protruded above the sealed plenum. A short detached hopper cylinder and undersized supports made the collector read as a box with chimneys. | **Fixed:** enclose filter media in the plenum, taper the hopper into the discharge throat, and extend four supports to the body. Before/after images and source retained. |
| `bucket-elevator` | Small bucket blocks protrude outside the opaque elevator casing, while buckets should be enclosed by the casing in the pictured form. | **Deferred:** a separate material/silhouette correction; not changed in this one-defect round. |
| `flare-stack` | The preview reads as a braced vertical flare stack with a visible tip, platform and ladder. | Left unchanged. |
| `palletizer-robot-cell` | The fenced cell and robot layout read as a palletizing work cell; the simplified robot is blocky but no single material mismatch was selected. | Left unchanged. |
| `vibratory-feeder` | The trough, base, springs and drive read as a vibratory feeder in the rendered view. | Left unchanged. |

The review contact sheet and all five before previews/sources are in `preview-review/` and `before/`. Only the baghouse was modified. The deferred bucket-elevator issue is recorded to avoid implying that the five-item sample had no other defect.
