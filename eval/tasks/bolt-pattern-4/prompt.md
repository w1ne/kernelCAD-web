# Task: 4-Hole Bolt Pattern

Drill a 4-position bolt pattern through a square mounting plate using a single batched `holes` call.

The script must accept this parameter:

```typescript
const boltDiam = param('boltDiam', 5, { min: 3, max: 8 });
```

Functional requirements:

- Plate: 80×80×6 mm.
- 4 holes through the plate at the corners of a 60×60 mm square centered on the plate (i.e. positions ±30, ±30 in face-local 2D).
- All 4 holes share the same diameter = `boltDiam`.
- All 4 holes go all the way through the plate.
- Use **one `holes(...)` batched call** (not 4 chained `.hole()` calls). The batched form is one editable feature record.
- Apply a 0.2 mm fillet to ALL bore lips in one call by addressing the collective `'wall'` ref.

Return the filleted plate.

Z-up, millimetres, degrees.
