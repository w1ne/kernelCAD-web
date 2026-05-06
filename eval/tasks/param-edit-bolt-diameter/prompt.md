# Task: Param-Editable Bolt Diameter

Build a parametric mounting plate whose bolt-hole diameter can be edited after the first build.

The script must declare this exact symbolic parameter:

```typescript
const boltDia = param('boltDia', 5, { min: 3, max: 10, description: 'bolt hole diameter' });
```

Functional requirements:

- Plate: 80×60×6 mm.
- Four through holes at positions ±30, ±20 in face-local 2D.
- Use one batched `.holes(...)` feature, not four separate `.hole(...)` calls.
- Hole diameter must be the `boltDia` ParamRef, not a literal or JS-derived number.
- Name the holes feature `mountBolts`.
- Apply a 0.2 mm fillet to the bolt-hole walls via `mountBolts.wall`.

Return the finished plate.

The evaluator will build the model, call `session.params.update([{ name: 'boltDia', value: 6 }])`, and verify only the affected records re-lower.
