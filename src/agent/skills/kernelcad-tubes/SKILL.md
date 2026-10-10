---
name: kernelcad-tubes
description: Model bent tubes and fluid lines between ports with tube(name, opts), tubeSpec(rules) and part.port(name), checked for bend radius, straight lengths and clearance, with a bend table per tube. Use when routing a rigid tube or line (hydraulic, fuel, coolant, oil, pneumatic) between two fittings, or when asked for a bend radius check or a bend table.
---

# kernelCAD: bent tubes

Route a rigid tube between two ports as straight legs joined by constant-radius bends. You give the corner points; the kernel builds one hollow solid, checks it against the bending and clearance rules, and reports a bend table, cut length and nearest neighbour for every tube.

```typescript
// A hydraulic line from a pump outlet (top face, +Z) to a valve inlet (-X face).
const asm = assembly('line');
const pump = asm.part('pump', box(60, 60, 60), { at: [0, 0, 0] })
  .connector('out', { type: 'axis', origin: { kind: 'vec3', value: [30, 30, 60] }, axis: [0, 0, 1], port: { system: 'hydraulic', od: 9.525 } });
const valve = asm.part('valve', box(40, 40, 40), { at: [200, 150, 100] })
  .connector('in', { type: 'axis', origin: { kind: 'vec3', value: [0, 20, 20] }, axis: [-1, 0, 0], port: { system: 'hydraulic', od: 9.525 } });

tubeSpec({ clearance: { default: 6 } });

const line = tube('hyd-1', {
  from: pump.port('out'),   // at [30, 30, 60], axis +Z
  to: valve.port('in'),     // at [200, 170, 120], axis -X
  via: [
    [30, 30, 120],          // on the pump port axis: straight up from the outlet
    [30, 170, 120],         // on the valve port axis: in line with the inlet
  ],
  wall: 0.89,
  bendRadius: 28.6,         // centreline radius, 3 x OD
});
asm.part('hyd-1', line);    // no `at`: the tube is already in assembly space
return asm.model();
```

## When to use

- A rigid line between two fittings: hydraulic, fuel, oil, coolant, pneumatic.
- You need the tube checked against a bender's rules and against the parts around it.
- You need a bend table (XYZ corners and length / rotation / angle rows) or a cut length.

Do not use `tube` for a structural tube frame (use profiles and `union`, recipe `welded-tube-frame-tray`), for a hose or any line that is not straight legs and circular bends, or for a tee. Two tubes from one port overlap and fail `tube.clearance.overlap`; a tee needs a fitting part with one port per branch.

## Ports

A port is an axis connector that also says what connects to it. Add `port` to the connector options:

```typescript
part.connector('out', {
  type: 'axis',
  origin: { kind: 'vec3', value: [30, 30, 60] },   // in the part's own frame, before `at`
  axis: [0, 0, 1],                                 // pointing out of the part
  port: { system: 'hydraulic', od: 9.525, minStraight: 30 },   // minStraight is optional, mm
});
```

- `system` is a free name. It becomes the tube's system and is what `clearance.pairs` matches on.
- `od` is the tube outer diameter the port takes, in mm. A tube between two ports takes its `od` from them; ports of different sizes, or an explicit `od` that disagrees, fail with `tube.port.od-mismatch`.
- `minStraight` raises the straight the tube must keep at this end above the `tubeSpec` rule.
- Model the boss as part of the part that owns the port (`body.union(boss)`), with the port at the boss face. The tube touches the boss by design, and only the part that owns the port is excused for that contact. A boss added as a separate assembly part is a clearance violation at 0 mm.

`part.port(name)` returns the port position, axis, size and system for `from` / `to`. It works when the connector has a `{ kind: 'vec3' }` origin and the part is placed with `at`. The position is `at` plus the origin, so `at: [x, 0, 0]` with `x = param('X', 60)` moves the port and the tube end with it.

`part.port(name)` does not work in three cases:

- The connector origin is a face reference, or the part is placed with `connect`: the call fails with `tube.port.unresolved`. Give the connector a `{ kind: 'vec3' }` origin and place the part with `at`.
- The part is moved by a mate: the call gives the position before the mate, and the gate reports `tube.port.misaligned` with the port's solved position. Place the part with `at` where the mate puts it, so the port is already there when the tube is routed.
- The end is not on a part: pass `{ point: [x, y, z], axis: [x, y, z] }`.

A plain point has no owning part. A tube that ends at a plain point on a part's surface is measured against that part in full and fails `tube.clearance.violated` at 0.00 mm, so use plain points for ends that sit in free space or on something the script does not model.

A plain point carries no size: when neither end is a port, pass `od`. `axis` is optional on a plain point; without it the direction of that end leg is not checked. At both ends the axis points out of the fitting, from the end toward the tube's next corner, so a tube that arrives at its `to` end from below has `axis: [0, 0, -1]` there.

## tube()

```typescript
tube(name, {
  from, to,            // part.port(name) or { point: [x, y, z], axis?: [x, y, z] }
  via?: [[x, y, z]],   // corner points in order; numbers or params
  od?,                 // mm; defaults to the port size
  wall,                // mm, below od / 2
  bendRadius,          // mm, centreline
  system?,             // defaults to the port's system
  material?,           // free name; a known grade (`mild-steel`, `aluminum-6061`) gives the mass
  density?,            // kg/m^3; gives the mass for any other material
  flow?: { lpm, fluid },   // fluid: 'water' | 'jet-a' | 'mil-prf-83282' | 'mil-prf-23699'
}): Shape
```

- The corners in `via` are where the leg centrelines would meet if the bends were sharp. The kernel rounds each corner with `bendRadius`.
- The kernel does not generate the end legs. The first corner must lie on the `from` port axis and the last corner on the `to` port axis. Take the port position and add a multiple of the port axis. When a corner is off the axis, `tube.port.misaligned` gives the nearest point on it.
- With no `via` the tube is one straight leg from `from` to `to`. A tube with no bends is exempt from the bend-radius and end-straight rules.
- `name` must be unique among the tubes of the script, with no comma, double quote or line break. It names the tube in diagnostics, in the report and in the bend-table file.
- Add the tube to the assembly with `asm.part(name, t)` and no `at`. A tube placed with `at`, or translated after routing, is reported by `tube.port.misaligned` because its ends left their ports.
- `.color(...)` on a tube is fine. Do not cut, fuse or otherwise modify the tube shape before adding it: the result is no longer recognised as that tube, so the tube is measured against its own modified copy and fails `tube.clearance.overlap`.
- An unknown `material` with no `density` is accepted; the tube's mass is then `null`.
- Units are mm, degrees, kg/m^3 and L/min.

## Rules

`tubeSpec({...})` declares the rules for every tube in the script. Call it once; if it is called more than once the last call wins.

| Field | Default | Rule | Diagnostic |
|---|---|---|---|
| `minBendRadiusFactor` | 3 | `bendRadius` is at least this many times the OD | `tube.bend.radius-too-small` |
| `minStraightBetweenBends` | 2 | the straight between two bends is at least this many times the OD | `tube.straight.between-bends-too-short` |
| `minStraightAtEnd` | 2.5 | the straight at each end is at least this many times the OD, or the port's `minStraight` when that is longer | `tube.straight.end-too-short` |
| `maxBendAngle` | 180 | no bend turns through more than this many degrees | `tube.bend.angle-exceeded` |
| `clearance.default` | 6 | mm between a tube and any part or other tube | `tube.clearance.violated`, `tube.clearance.overlap` |
| `clearance.pairs` | none | `[{ a, b, min }]`: mm between a tube of system `a` and a tube of system `b`, in either order | `tube.clearance.violated` |

- Without `tubeSpec` the defaults apply and the result carries a `tube.spec.defaulted` warning. Declare `tubeSpec({})` to accept the defaults without the warning.
- `tubeSpec` rejects unknown keys, so a misspelt rule fails instead of being ignored.
- Clearance is measured surface to surface on the solids, in the solved assembly. Against the part that owns one of the tube's ports, the end straight the rule requires is left out of the measurement; the rest of the tube is measured.
- A straight is what is left of a leg after the bends at its ends. A 90 degree bend uses `bendRadius` of each leg it joins, so a leg between two 90 degree bends needs `2 * bendRadius + minStraightBetweenBends * od`, and an end leg needs `bendRadius + minStraightAtEnd * od`. Size the legs from these before writing corners.

## Reading the diagnostics

Two kinds of failure, both with measured values in the message.

Argument errors stop the script at the `tube` or `tubeSpec` call. The code is `feature.invalid-args` and the message starts with a `tube.<reason>:` or `tubeSpec:` prefix:

| Prefix | What to change |
|---|---|
| `tube.corner.unreachable` | A leg is too short for the bends at its ends. Lengthen the leg by the stated amount, or lower `bendRadius`. |
| `tube.port.od-mismatch` | Make the port sizes and `od` agree. |
| `tube.od.required` | Pass `od`, or end the tube on a port. |
| `tube.wall.invalid`, `tube.od.invalid`, `tube.bend-radius.invalid` | Pass a positive number; `wall` below `od / 2`. |
| `tube.port.not-found`, `tube.port.not-a-port` | Register the connector before calling `part.port(name)`, with `port: { system, od }`. |
| `tube.port.unresolved` | Give the connector a `{ kind: 'vec3' }` origin and place the part with `at`. A `{ point, axis }` end works only where the tube does not touch a modelled part. |
| `tube.name.invalid` | Use a unique name with no comma, quote or line break. |
| `tube.flow.unknown-fluid` | Use one of the listed fluids, or leave `flow` out. |

Gate errors come after the build, as `tube.*` diagnostics. The script built, so the report is still there to read:

| Code | What to change |
|---|---|
| `tube.bend.radius-too-small` | Raise `bendRadius` to the stated value. |
| `tube.straight.between-bends-too-short` | Move the two corners of the named leg apart by the shortfall, or lower `bendRadius`. Legs are numbered from 0. |
| `tube.straight.end-too-short` | Move the first (or last) corner away from the port along the port axis by the shortfall. |
| `tube.bend.angle-exceeded` | Move the corner so the bend opens up, or add a corner to split it. Bends are numbered from 1. |
| `tube.port.misaligned` | "off the port axis": put the corner at the point the message gives. "from port" or "from its captured point": the part or the tube moved; place the part with `at` at the stated position, and add the tube with no `at`. |
| `tube.clearance.violated` | Move the corner nearest the stated closest point away from the named part or tube by the shortfall (rule minus measured). |
| `tube.clearance.overlap` | The tube passes through the named part or tube. Route the leg around it. |

A pair of tubes is reported once, on the tube declared first, so the corner to move may belong to the other tube named in the message.

## The loop

1. Write the ports and a first set of corners on the port axes.
2. Evaluate: `evaluate_script`, or `kernelcad evaluate <file> --json`.
3. For each `tube.*` diagnostic, change the argument the table names by at least the stated amount.
4. Repeat until there are no errors, then read `tubes.lines[].minClearance` to see how much room each line has left.

## The line report

`evaluate_script` and `kernelcad evaluate <file> --json` return a `tubes` object whenever the script builds a tube. It is there when a gate fails too, so you can read the measured values next to the diagnostics.

`tubes.lines[]`, one entry per tube:

| Field | Meaning |
|---|---|
| `name`, `system`, `od`, `wall`, `bendRadius`, `material` | as declared |
| `cutLength` | centreline length, mm |
| `bends` | number of bends |
| `xyz` | bend-table corner points in the tube's own frame: first point at the origin, first leg along +X |
| `lra` | one row per bend: `l` straight before the bend (mm), `r` rotation of the bend plane from the previous bend (degrees), `a` bend angle (degrees) |
| `lastStraight`, `minStraight` | straight after the last bend; shortest straight of the tube (mm) |
| `minClearance` | `{ mm, to, at }`: distance to the nearest part or tube, its name, and the closest point on this tube |
| `massKg` | tube mass, or `null` without a known material or a `density` |
| `volumeInternalMl` | bore volume |
| `pressureDropKPa` | estimate for the declared `flow`, or `null` without one |

`tubes.systems[]` has one row per system: `system`, `lines`, `cutLength`, `massKg`.

## Bend-table export

```bash
kernelcad export bend-table line.kcad.ts -o out/bend-tables
```

`-o` is a directory. The export writes one CSV per tube, named after the tube: a header with the name, OD, wall, bend radius and cut length, then the XYZ points, then the bend rows and the last straight. From MCP: `export({ format: 'bend-table', output_path: 'out/bend-tables', code })`.

The export is refused when the build or a tube gate reports an error; fix the route first. A script with no tube gives `export.bend-table.no-tubes`.

`inspect({ of: 'bend-table' })` is the sheet-metal bend table, not this one.

## Verification gates

| Gate | Pass criterion |
|------|----------------|
| G-eval | `kernelcad evaluate` exits 0 with no `tube.*` error and no `feature.invalid-args` |
| G-spec-declared | no `tube.spec.defaulted` warning: the script calls `tubeSpec` |
| G-lines-present | `tubes.lines` has one entry per tube you meant to route, each with the system you expect |
| G-clearance-margin | every `minClearance.mm` is at or above the rule for that pair |
| G-render | a render shows every tube leaving its boss square and passing through no part |

## Related skills

- `kernelcad-assemblies`: parts, `at`, connectors and mates that the ports sit on.
- `kernelcad-params`: `at`, `via`, `od`, `wall` and `bendRadius` accept params, so a moved part moves the tube end.
- `kernelcad-sheet-metal`: folded sheet parts and their own bend table.
- `kernelcad-repair`: the repair loop when an evaluation reports an error.
