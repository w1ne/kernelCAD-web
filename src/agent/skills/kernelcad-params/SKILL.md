---
name: kernelcad-params
description: Editable symbolic parameters — param(), params(), ParamRef arithmetic, MCP set_param. Use when the model needs values the agent or studio can change live.
---

# kernelCAD — editable parameters

Use `param()` for values the user may want to tweak after the first build; use literals for incidental dimensions. A param returns a symbolic `ParamRef`, not a number, so do not do JS arithmetic with it (`paramRef / 2` throws `feature.invalid-args` at the coercion site — the result would be a frozen number that stops re-evaluating on param updates). For derived dimensions, chain the arithmetic methods on the ParamRef itself: `.add`, `.subtract`, `.multiply`, `.divide`, `.negate` each return a new ParamRef built on a structured expression that re-evaluates whenever the underlying param changes — e.g. `param('r', 5).divide(2)` for a half-radius, or `param('w', 80).subtract(param('margin', 5).multiply(2))` for a derived inset width.

## `param()` / `params()` API

```typescript
// Single named param — returns a symbolic ParamRef<T>.
param<T extends number | boolean>(name: string, defaultValue: T, opts?: {
  min?: number;
  max?: number;
  description?: string;
}): ParamRef<T>;

// Batched shorthand — every key becomes a ParamRef of the same type as
// its default value. Accepts only number and boolean defaults.
params({ width: 60, addCablePort: true }): {
  width: ParamRef<number>;
  addCablePort: ParamRef<boolean>;
};
```

### ParamRef arithmetic

`ParamRef` is a branded symbolic node. Do **not** use JS operators; use the chain methods:

| Method | Returns | Notes |
|--------|---------|-------|
| `.add(n)` | `ParamRef<number>` | `paramRef.add(5)` |
| `.subtract(n)` | `ParamRef<number>` | `paramRef.subtract(margin)` |
| `.multiply(n)` | `ParamRef<number>` | `paramRef.multiply(2)` |
| `.divide(n)` | `ParamRef<number>` | `paramRef.divide(2)` |
| `.negate()` | `ParamRef<number>` | `-paramRef` symbolic |

Each method accepts either a plain number or another `ParamRef`. Chains stay fully symbolic: `radius.multiply(2).add(1)` is a `ParamRef`, not a number, and re-evaluates on each param change.

### Usage example

```typescript
const boltDia = param('boltDia', 5, { min: 3, max: 10, description: 'bolt hole diameter' });
const addCablePort = param('addCablePort', true, { description: 'include cable pass-through' });

return box(80, 50, 6)
  .holes('top', {
    positions: [{ u: -30, v: -20 }, { u: 30, v: -20 }],
    diameter: boltDia,
    depth: 'through',
    name: 'mountBolts',
  })
  .cutout(
    path().moveTo(-8, -5).lineTo(8, -5).lineTo(8, 5).lineTo(-8, 5).close(),
    { face: 'top', depth: 'through', name: 'cablePort', enabled: addCablePort },
  );
```

The batched declaration form is useful for compact top-of-file param blocks:

```typescript
const p = params({ plateW: 80, plateD: 50, plateT: 6 });
return box(p.plateW, p.plateD, p.plateT);
```

### Typed params: boolean / choice / string

`param()` also infers **choice** and **string** kinds from the default value and `meta`:

```typescript
// Boolean — unchanged, a ParamRef<boolean>.
const hasLid = param('HasLid', true, { description: 'chamfer the top edge as a lid seat' });

// Choice — string default + meta.choices -> TypedParamRef<string>, not a ParamRef.
const screw = param('Screw', 'M4', { choices: ['M3', 'M4', 'M5'] });

// Plain string — string default, no choices -> TypedParamRef<string>.
const label = param('Label', 'KCAD', { maxLength: 24 });
```

`choice`/`string` params return a **`TypedParamRef`**, a different type from
the numeric/boolean `ParamRef`. It does NOT support `.add()`/`.multiply()`/etc
(meaningless for strings) and cannot be coerced to a number — read `.value`
at evaluate time instead:

```typescript
if (hasLid.value) { body = body.chamfer('top', 1); }

const diameters: Record<string, number> = { M3: 3.4, M4: 4.5, M5: 5.5 };
body = body.hole('top', { u: 0, v: 0, diameter: diameters[screw.value], depth: 'through' });

const text = sketch.text(label.value, { size: 6, align: 'center', position: [0, 0] });
```

Unlike numeric `ParamRef`s, `TypedParamRef`s resolve **eagerly** (the value
at `param()` call time, not a re-evaluated symbolic AST) — because control
flow (`if`), object-key lookups, and text content have no meaningful
partial re-lower; `set_param` re-runs the whole script body with the new
value, which is exactly what eager resolution gives you.

`set_param({ code, param_name: 'Screw', new_value: 'M5' })` works the same
way for typed params as for numeric ones — a value outside the declared
`choices` set (or longer than `maxLength`) surfaces `feature.invalid-args`
(hint `invalid-args.param.choice-invalid` / `invalid-args.param.value-out-of-range`)
on re-evaluation. Booleans set via `set_param` take a literal `true`/`false`,
not a string.

The batched `params({...})` shorthand still only accepts `number | boolean`
defaults — declare choice/string params individually via `param()`.

### MCP: `inspect({ of: 'params' })` / `set_param`

For post-build edits, use MCP `inspect({ of: 'params' })` to inspect the active evaluated session, then `set_param({ code, param_name: 'boltDia', new_value: 6 })` to rewrite the `param()` default in the source. The edit is source-only and side-effect-free — it returns the modified code plus diagnostics from re-evaluating; the caller persists the returned code. A new value outside `[min, max]` surfaces as a `feature.invalid-args` diagnostic.

```typescript
// Via MCP (introspection session):
inspect({ of: 'params' })
// → [
//     { name: 'boltDia', type: 'number', value: 5, defaultValue: 5, min: 3, max: 10, description: '...' },
//     { name: 'HasLid', type: 'boolean', value: true, defaultValue: true },
//     { name: 'Screw', type: 'choice', value: 'M4', defaultValue: 'M4', choices: ['M3', 'M4', 'M5'] },
//     { name: 'Label', type: 'string', value: 'KCAD', defaultValue: 'KCAD' },
//   ]

set_param({ code, param_name: 'boltDia', new_value: 6 })
// → { code: '...rewritten source...', diagnostics: [] }

set_param({ code, param_name: 'Screw', new_value: 'M5' })
// → { code: '...rewritten source...', diagnostics: [] }
```

### `sweep_tolerance` is numeric-only

`kinematic.sweepTolerance({ params: {...} })` only accepts `number` params
(`{ values: [...] }` or `{ min, max, steps }`) — sweeping a boolean/choice/
string param has no meaningful range and fails fast with
`feature.invalid-args` (hint `invalid-args.param.type-mismatch`) before any
combo is evaluated.

## Parametric assembly frames

Every Vec3 surface in the assembly API accepts `Editable<number>` per coord, so connector frames and joint frames can be built from `param()` values. Beyond plain tuples, the `worldOrigin` of a connector is itself a symbolic Vec3 that can be passed back into another assembly input — when downstream consumers read it (e.g. a joint origin = `parent.connector('tip').worldOrigin`), edits to the underlying params propagate live through the chain.

```typescript
const baseX = param('baseX', 70);
const plate = box(baseX, 46, 4);
const arm = assembly('arm');
const base = arm.part('base', plate, {
  connectors: { pivot: { origin: [baseX.divide(2), 23, 4], axis: [0, 0, 1] } },
});
const shoulder = arm.part('shoulder', shoulderLink, {
  connectors: { root: { origin: [0, 9, 2], axis: [0, 1, 0] } },
  connect: { connector: 'root', to: base.connector('pivot'), name: 'base-to-shoulder' },
});
arm.mate('yaw', 'base.pivot', 'shoulder.root', 'revolute', {});
```

`setParamValue('baseX', 100)` reactively rebuilds the plate AND the connector frame AND the joint origin AND the dependent shoulder placement — all in one re-lower. Axis vectors normalize at lower time; an axis whose components resolve to `[0, 0, 0]` raises `feature.invalid-args` with hint `invalid-args.axis.zero`.

## Diagnostic codes

The following diagnostic codes surface in the `diagnostics[]` array returned by `kernelcad evaluate`:

| Code | Trigger |
|------|---------|
| `feature.invalid-args` | `param()` default is outside declared `min`/`max`, or a `ParamRef` axis resolves to `[0,0,0]` |
| `feature.invalid-args` (hint `invalid-args.axis.zero`) | A Vec3 built from params resolves to the zero vector at lower time |
| `feature.invalid-args` (hint `invalid-args.param.choice-invalid`) | A `choice` param's value is not in its declared `meta.choices`, or a `choice` param is declared without `meta.choices` |
| `feature.invalid-args` (hint `invalid-args.param.value-out-of-range`) | A `string` param's value exceeds `meta.maxLength` |
| `feature.invalid-args` (hint `invalid-args.param.type-mismatch`) | A `TypedParamRef` (choice/string) is coerced to a number, used where a numeric `Editable` is expected, or swept via `sweep_tolerance` |

Boundary errors from `set_param` setting a value outside `[min, max]` also surface as `feature.invalid-args` when the rewritten source is re-evaluated.

## Verification gates

After authoring with editable parameters, run before reporting done:

| Gate | Pass criterion |
|------|----------------|
| G-eval | `kernelcad evaluate` exits 0 — no `param.*` diagnostics |
| G-default-in-range | Every `param()` default value satisfies its declared `min` / `max` |
| G-unique-names | No two `param()` calls share a `name` in the same script — duplicates fail at capture time |
| G-paramref-survives-arithmetic | `ParamRef.add/.subtract/.multiply/.divide/.negate` return new ParamRefs, not numbers; chains like `radius.multiply(2).add(1)` stay symbolic |
| G-params-update-keeps-bounds | When the studio or MCP `set_param` sets a new value, it must satisfy `min` / `max`; otherwise re-evaluating the rewritten source surfaces a diagnostic |

## Related skills

- `kernelcad-authoring` — primitives + sketches accept Editable<number> wherever a number is accepted.
- `kernelcad-features` — fillet radius / hole diameter / shell thickness all accept ParamRefs.
- `kernelcad-assemblies` — pose ParamRefs drive mate angles / translations via `.solvedModel()`.
- `kernelcad-mcp` — `set_param({ code, param_name, new_value })` rewrites a `param()` default in the source.
