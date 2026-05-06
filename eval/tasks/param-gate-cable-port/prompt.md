# Task: Param-Gated Cable Port

Build a service-panel plate with an optional cable port controlled by a boolean symbolic parameter.

The script must declare this exact parameter:

```typescript
const addCablePort = param('addCablePort', true, { description: 'include the optional cable pass-through' });
```

Functional requirements:

- Plate: 80×50×6 mm.
- Add a rectangular through cutout centered on the top face, 16×10 mm in face-local 2D.
- The cutout must use `enabled: addCablePort`.
- Name the cutout feature `cablePort`.
- Add a 0.5 mm fillet to the cable-port walls via `cablePort.wall`.

Return the finished plate.

The evaluator will build the model, call `session.params.update([{ name: 'addCablePort', value: false }])`, and verify the cutout gates off while the downstream fillet becomes a soft-warning passthrough.
