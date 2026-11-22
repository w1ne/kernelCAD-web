# Reinforcing bar cage repair

The original asset placed twelve named bars at only six unique positions. Its eight supposed ties were straight rods at the same height. The result was a flat grid above disconnected support saddles.

The repair places six bars in each of two layers and encloses them with eight closed rectangular ties. The ties rest on the existing saddles. It remains an illustrative CC0 prop, not a structural reinforcement schedule.

The native GLB regression checks unique bar centres, layer separation, tie window openings by triangle intersection, all four tie sides, support contact, ground origin and triangle budget. It repeats the geometry checks at scale 0.7 and 1.3. The unmodified source failed the new uniqueness test. The canonical preview is checked against a fresh production render.

See `verification.json` for numbers and commands, `before.kcad.ts` for the negative control, and `comparison.mp4` for the visually inspected six-second before/after still comparison. Neither view represents hardware validation.
