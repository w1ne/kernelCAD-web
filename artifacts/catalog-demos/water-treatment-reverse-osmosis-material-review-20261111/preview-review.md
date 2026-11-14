# Preview audit ledger — water treatment

**Reviewed:** 2026-11-11
**Scope:** five rendered water-treatment previews; material separation and whether the visible finish suits the named component.
**Exclusions:** currently open catalog/manufacturing PRs did not list these water-treatment asset paths. Open issue search returned no water-treatment asset issue. This audit avoids the recently reviewed `water-filter-cartridge-housing`, `vertical-turbine-pump`, `backwash-pump-skid`, and the industrial-plant/mining semantic-review targets.

| Asset | Preview reading | Decision |
| --- | --- | --- |
| `electromagnetic-flow-meter` | Vertical inline body, paired flanges, separate electronics head and display are visible. | No material mismatch found. |
| `lamella-clarifier` | Concrete tank, inclined plate pack, inlet compartment and launder are distinguishable. | No material mismatch found. |
| `uv-disinfection-channel` | Concrete channel, two installed lamp-module banks, service rack, cabinets and handrail are distinguishable. | No material mismatch found. |
| `bar-screen-channel` | Concrete channel, inclined screen, coated drive frame, discharge bin and rails read as a headworks screen. | No material mismatch found. |
| `reverse-osmosis-skid` | Three horizontal membrane housings, piping, frame, pump and cabinet are visible. The shells shared the stainless process-piping control. | **Mismatch:** RO pressure-vessel shells use a glass-reinforced epoxy/FRP finish. Added a dedicated `reinforcedComposite` material control and applied it only to the shells. |

The before image was read from the committed preview at the audit start. The
after image was generated from the edited source with
`npx tsx scripts/renderCatalogPreviews.ts reverse-osmosis-skid` and inspected
visually. The only source change is a material assignment and its UI control;
the object geometry and scale were not altered.
