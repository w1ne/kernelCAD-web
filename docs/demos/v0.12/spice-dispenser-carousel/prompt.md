# Prompt — spice-dispenser carousel

Design a compact countertop spice dispenser in a Ø88 × 110 mm "mug" format that doses a measured ~0.5 ml on demand.

Architecture: make selection and metering two independently sealed degrees of freedom.

- A six-chamber **chamber drum** rotates inside a static clear shell, driven by a central bus servo. Each chamber holds ~18 ml; the drum indexes one chamber pitch (60°) to bring the next chamber over a single metering station.
- A pocket **metering disc** at that station, driven by a small hobby servo, fills under the parked chamber's outlet, swings ~117° to lay its pocket over an enclosed drop chute, dwells to let the dose fall, then returns.
- The two DOFs must never move at once, so the mechanism stays collision-free; the dose path is fully enclosed (pocket → through-plate → chute → side spout) so the electronics bay never sees spice.

Seal the metering disc as a flat lapped rotary valve; cap the electronics compartment with a splash floor. Target Formlabs SLA build rules (running fits ≥0.25 mm/face, walls ≥1.5 mm, heat-set inserts over resin threads).

Deliver the full dispense cycle as a looping cutaway animation: index → meter swing → drop dwell → meter return → drum re-home, with the interior visible and the motion verified collision-free at every pose.
