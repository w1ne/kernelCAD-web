# Five-preview audit ledger: data-center-infrastructure, 2026-11-20

Audit base: `feat/catalog-2000` at `ce38fb1a2`.
Selection: five rack and IT assets that were not in any audit ledger
(`rack-kvm-console`, `blade-server-enclosure`, `data-center-battery-cabinet`,
`fiber-patch-panel`, `top-of-rack-network-switch`). No open issue or PR targets these assets.

| Asset | Preview check | Material finding | Other noted limits (not fixed) |
| --- | --- | --- | --- |
| `rack-kvm-console` | Reads as a rack tray with a large cyan block standing on it. | **Fixed this round.** `display-housing` (387 x 211 x 300 mm) was one solid block on the `glass` control. A KVM display housing is a painted shell; only the screen is glass. | Housing is a deep box, not a thin fold-down lid; `keyboard-tray` has no keys; `slide-rail-left/right` run side to side (x axis) and stick out past both ears. |
| `blade-server-enclosure` | Reads as a chassis with six vertical sleds and small amber handles. | Plausible: steel chassis and sleds, polymer `service-handle`. | "Mounting ears" are full-depth 800 mm side plates; slide rails run side to side (x axis) through the chassis and stick out 20 mm past both ears; there are no rear service rails. |
| `data-center-battery-cabinet` | Reads as a tall plain cabinet on a plinth with a display, knob and handle. | Plausible: steel shell, glass display, polymer handle and knob, rubber gland. | `battery-drawer-0..4` (front y -407 mm) and `battery-vent-slot-*` (front y -420 mm) sit inside or flush with the shell front (y -420 mm), so the "repeated access drawers" do not show; `cable-entry` hidden in the plinth. |
| `fiber-patch-panel` | Reads as a 2U-high bar with one row of 12 amber couplers. | Plausible: steel body, polymer couplers. | Description says "paired connector rows" but there is one row; slide rails stick out past both ears as rods. |
| `top-of-rack-network-switch` | Reads as a 1U slab with a fine row of front stubs and an amber status control. | Plausible: steel body and port shields, polymer status control. | Ports are round stubs, not square RJ45/SFP openings; slide rails stick out past both ears. |

Decision: fix `rack-kvm-console`. The housing moves to the existing `steel` control and a
350 x 255 mm `display-screen` part on the housing front face keeps the `glass` control
effective (248 -> 260 triangles).
