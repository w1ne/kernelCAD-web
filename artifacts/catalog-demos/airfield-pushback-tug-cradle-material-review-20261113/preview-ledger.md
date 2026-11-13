# Airfield ground-support preview ledger — 2026-11-13

Five rendered ground-support-equipment assets were reviewed from
`catalog/kits/airfield/previews/` at 512 × 512 px. No open PR other than #1258
changes an airfield source, and open issue searches for `airfield` and
`pushback tug` returned no results.

| Asset | Visual review | Result |
|---|---|---|
| `pushback-tug` | Low chassis, yellow cab and rear body, four tyres and a rear tow bar are visible. The front `nose-wheel-cradle` plate rendered in the same dark colour as the tyres because the source assigned it `rubber`. A nose-wheel cradle is a rigid steel structure. | **Selected material mismatch.** Remapped the cradle to the existing `stainlessSteel` control. The tug still reads as two yellow boxes on a flat deck; that silhouette weakness is a separate geometry issue and is not changed in this material-only round. |
| `aircraft-fuel-truck` | Yellow cab, grey tank and dark tyres. Tank and hose-reel use the metal control; no material mismatch. The tank and the hose reel visibly float above the deck with no supports. | No material mismatch selected. Geometry concern recorded. |
| `deicing-truck` | Cab, fluid tank, boom and basket are identifiable. Tank and basket use vehicle paint; boom uses steel. | No material mismatch selected. |
| `belt-loader` | Inclined dark belt on a steel frame, support post and cab read as a belt loader. Belt rubber is correct. | No material mismatch selected. |
| `aircraft-maintenance-lift` | Scissor arms, galvanised platforms, guardrail and tyres read as a scissor lift. | No material mismatch selected. |

## Dimension note

The generated index reports `pushback-tug` at 0.5784 × 0.1798 × 0.3072 m. A real
aircraft pushback tug is several metres long. The source states it is scene-scale
geometry with an `Overall scale` control, so this round does not change it; the
dimension gap is recorded here for a separate scale review of the airfield kit.
