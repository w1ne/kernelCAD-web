# Five-preview semantic review — 18 November 2026

## Selection and overlap check

PR #1258 was checked first: it is merged, its 17 reported CI checks succeeded,
and it has no submitted review. Current PR #1507 is open at
`bbbb01f4485a134d2b07b2b48aab24c9a1699931`; its `build-and-checks`, `changed-tests`,
and `lint` checks succeeded, with no submitted review. It does not change any
of these five construction-equipment sources. Exact open-issue and open-PR
searches for each selected ID returned no match. Tracked fixes #1298, #1305,
#1307 and #1308 change assets in other kits. The machine references used for
the private comparison are recorded in `kernelCAD-private`.

## Rendered-preview ledger

The envelope is the generated index's X × Y × Z-up size in metres, not an
equipment specification. All five checked-in previews were opened and compared
with their source labels and visible material zones.

| Asset | Envelope (m) | Tris / budget | What the preview shows | Review result |
|---|---:|---:|---|---|
| `articulated-dump-truck` | 1.334 × 1.000 × 0.808 | 1,232 / 2,800 | Forward cab, high-sided open body and six dark wheels read as a dump truck. The central articulation joint is too visually small to communicate an articulated chassis clearly. | No material mismatch selected; silhouette and scale remain a separate concern. |
| `asphalt-transfer-conveyor` | 1.722 × 1.284 × 0.604 | 360 / 2,200 | Inclined dark belt, twin support legs, transport axle and feed hopper read as a mobile transfer conveyor. | No material mismatch selected. |
| `ride-on-concrete-saw` | 0.940 × 0.559 × 0.509 | 632 / 2,200 | Low wheeled frame, engine cover, seat, water tank and front blade guard are visible. The blade is hidden by the guard in the default view, so the thumbnail reads as a compact machine more clearly than as a saw. | No material mismatch selected; the hidden blade is a separate preview/detail limitation. |
| `road-reclaimer` | 1.542 × 1.004 × 1.089 | 816 / 2,200 | Four wheels, chassis, canopy, engine cover and milling hood form a small road machine. The default angle hides the cutter teeth beneath the hood. The indexed envelope is much smaller than a full-size reclaimer; this remains an unresolved scale/silhouette concern. | **Selected material mismatch:** seven modeled cutter teeth use equipment enamel while the cutter drum uses structural steel. |
| `water-tanker-truck` | 1.454 × 0.831 × 1.102 | 1,196 / 2,200 | Cab, horizontal tank, four wheels and rear spray bar read as a site water truck. The hose reel is represented by a plain dark block, without a visible spool. | No material mismatch selected; hose-reel shape is a separate geometry follow-up. |

## Selected correction

The seven source parts `cutting-tooth-0` through `cutting-tooth-6` now use the
existing `structuralSteelColor` control, matching the material role of the
cutter drum. The machine's paint stays on the engine cover, deck, canopy and
milling hood. No geometry, scale, asset IDs, controls, presets or triangle count
changed.

The regular catalog thumbnail is byte-identical before and after because it
occludes the selected parts. Focused kernelCAD inspection renders isolate the
cutter drum and teeth at the same camera/settings, so the material change is
visible in the retained before/after evidence. The separate scale and silhouette
concern is recorded here rather than presented as resolved.

## Limits

The public page and preview returned HTTP 200 before the source edit, and the
public preview matched the checked-in baseline PNG byte-for-byte. The change is
on an unmerged branch; this review does not claim post-deploy behavior,
equipment simulation, manufacturing suitability, machine ratings or hardware
acceptance.
