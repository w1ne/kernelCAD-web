---
name: kernelcad-tubes
description: Model bent tubes and fluid lines between ports with tube(name, opts), tubeSpec(rules) and part.port(name), checked for bend radius, straight lengths and clearance, with a bend table per tube. A tube can branch off another tube at a 90 degree tee. Use when routing a rigid tube or line (hydraulic, fuel, coolant, oil, pneumatic) between two fittings, when one line feeds two places, or when asked for a bend radius check or a bend table.
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

Do not use `tube` for a structural tube frame (use profiles and `union`, recipe `welded-tube-frame-tray`), or for a hose or any line that is not straight legs and circular bends. Two tubes from one port overlap and fail `tube.clearance.overlap`: route one tube from the port and make the second a branch of it (see "Branches").

## Ports

A port is an axis connector that also says what connects to it. Add `port` to the connector options:

```typescript
part.connector('out', {
  type: 'axis',
  origin: { kind: 'vec3', value: [30, 30, 60] },   // in the part's own frame, before `at`; plain numbers only
  axis: [0, 0, 1],                                 // pointing out of the part
  port: { system: 'hydraulic', od: 9.525, minStraight: 30 },   // minStraight is optional, mm
});
```

- `system` is a free name. It becomes the tube's system and is what `clearance.pairs` matches on.
- `od` is the tube outer diameter the port takes, in mm. A tube between two ports takes its `od` from them; ports of different sizes, or an explicit `od` that disagrees, fail with `tube.port.od-mismatch`.
- `minStraight` raises the straight the tube must keep at this end above the `tubeSpec` rule.
- The origin takes three plain numbers. A param in it fails with `feature.invalid-args`. To move a port with a param, build the part in its own frame and put the param in the part's `at`.
- Model the boss as part of the part that owns the port (`body.union(boss)`), with the port at the boss face. The tube touches the boss by design, and only the part that owns the port is excused for that contact. A boss added as a separate assembly part is a clearance violation at 0 mm.

`part.port(name)` returns the port position, axis, size and system for `from` / `to`. It works when the connector has a `{ kind: 'vec3' }` origin, on a part placed with `at` or with `connect`. The position is `at` plus the origin, so `at: [x, 0, 0]` with `x = param('X', 60)` moves the port and the tube end with it. For a part placed with `connect`, `at` is the position `connect` works out from the two connectors, so a param that moves the parent moves the port too.

`part.port(name)` is for passing a port to `tube`. A script cannot read coordinates from it: with a param in `at` the numbers are not resolved yet. To learn where a port is, read `ports` in the evaluation result (see "The port report").

`part.port(name)` does not work in three cases. In each, pass a plain end instead: `{ point: [x, y, z], axis: [x, y, z], part: '<part name>' }`, with the position and axis in assembly space.

- The connector origin is a face reference: the call fails with `tube.port.unresolved`.
- The part is moved by a mate: the call gives the position before the mate, and the gate reports `tube.port.misaligned` with the port's solved position. Use the `origin` and `axis` that `ports` gives for that port (`placedBy: 'mate'`) as the `point` and `axis`.
- The end is not on a part: leave `part` out.

`part` is the name the part was added under with `asm.part(name, ...)`. It makes that part the owner of the end, exactly as for a port: the fitting zone at that end may touch the part, and the rest of the tube is measured against it. The end must touch the named part: an end more than 0.01 mm away fails `tube.port.misaligned` with the measured gap and gets no fitting zone. A name the assembly does not have fails `tube.end.part-not-found`, which lists the part names. Without `part`, a tube that ends on a part's surface is measured against that part in full and fails `tube.clearance.violated` at 0.00 mm.

A plain end carries no size and no system: when neither end is a port, pass `od`, and pass `system` if a clearance pair should apply. `axis` is optional; without it the direction of that end leg is not checked. At both ends the axis points out of the fitting, from the end toward the tube's next corner, so a tube that arrives at its `to` end from below has `axis: [0, 0, -1]` there.

## Branches

A tube can start or end on another tube instead of on a port: a 90 degree tee. The tube it joins is the trunk.

```typescript
// Trunk: from the block outlet at [50, 50, 100] up to z = 250, then along +X to actuator 1 at [300, 50, 250].
const trunk = tube('act-supply', { from: block.port('out'), to: act1.port('in'), via: [[50, 50, 250]], wall: 0.9, bendRadius: 40 });
// Branch: leaves the trunk's second leg at x = 190, straight up, then along -X to actuator 2 at [-200, 50, 400].
const branch = tube('act-supply-2', {
  from: { tube: 'act-supply', at: 272.83, axis: [0, 0, 1] },   // 272.83 mm along the trunk centreline from its `from` end
  to: act2.port('in'),
  via: [[190, 50, 400]],                                       // on the branch axis: straight above the tee
  wall: 0.9, bendRadius: 40,
});
asm.part('act-supply', trunk);
asm.part('act-supply-2', branch);
```

- `tube` is the trunk's name. Declare the trunk before the branch; a name no earlier tube has fails at the call with `tube.branch.trunk-not-found`.
- `at` is the station of the tee: mm along the trunk centreline from the trunk's `from` end, through its straights and bends. It may be a param.
- `axis` is the direction the branch leaves the trunk along. It must be square to the trunk leg. Only 90 degree tees are built.
- Either end may be a branch end, or both. A branch may be the trunk of another branch.
- A branch end has no size: the tube takes its `od` from the port at its other end, or from `od`. The branch may not be larger than the trunk.
- The branch takes the trunk's system: a line does not change system. A `system` option, or a port at the branch's other end, that names another system fails with `tube.branch.system-mismatch`. When the trunk has no system the branch takes its system the way any tube does.

Finding `at`. Evaluate with the trunk alone and read its line in `tubes.lines`: each `lra` row is the straight `l` before a bend and the bend angle `a`. The station at the end of bend `k` is the sum, over bends 1 to `k`, of `l + bendRadius * a * pi / 180`. Add the distance along the next straight to the tee. For a 90 degree bend the arc is `bendRadius * 1.5708`. In the example the trunk goes up 110 mm, turns 90 degrees at radius 40 (62.83 mm), and the tee is 100 mm along the second leg: `at = 110 + 62.83 + 100 = 272.83`.

Where the branch starts. The branch centreline starts on the trunk's outer wall, at the trunk centreline point plus half the trunk OD along `axis`. Put the branch's first corner on that line: station point plus `L * axis`. The end straight and the cut length of the branch are measured from the trunk wall. The saddle cut reaches past that point at the sides, by up to half the trunk OD when both tubes are the same size, so cut the stock that much longer.

The joint is worked out from the trunk each time the model is built. A param that moves the trunk, or a param in `at`, moves the tee. The other corners of the branch do not follow by themselves: write them from the same params.

What is built. The branch solid is cut to the trunk's outer wall, so the two solids touch and share no volume. The trunk is not drilled: its solid is the plain tube, and the hole at the tee is not modelled. Mass and bore volume of the trunk are those of the undrilled tube. STEP keeps one solid per tube.

Rules, each checked on the built model:

| Rule | Diagnostic |
|---|---|
| `at` lands on a straight of the trunk, not on a bend and not beyond its end | `tube.branch.not-on-straight` |
| the tee keeps the trunk's `minStraightBetweenBends` straight from a bend of the trunk, and the trunk's end straight from either end of the trunk | `tube.branch.too-close` |
| `axis` is within 0.5 degrees of square to the trunk leg | `tube.branch.axis-not-square` |
| the branch OD is at most the trunk OD | `tube.branch.od-too-large` |
| the branch keeps its own end straight, measured from the trunk wall | `tube.straight.end-too-short` |

Clearance. A branch touches its trunk at the tee. Against its own trunk the branch is measured without its joint zone: the end straight its rule requires, or the clearance for the pair when that is longer, and never more than the end straight it has. Past the joint zone the branch is held to the normal clearance against the trunk, so a branch that turns back to the trunk fails. Against every other tube and every part the branch is measured in full.

## tube()

```typescript
tube(name, {
  from, to,            // part.port(name), { point: [x, y, z], axis?: [x, y, z], part?: 'name' }
                       // or { tube: 'trunk name', at: mm, axis: [x, y, z] } (see "Branches")
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
- The kernel does not generate the end legs. The first corner must lie on the `from` port axis and the last corner on the `to` port axis. Take the port position and add a multiple of the port axis. When a corner is off the axis, `tube.port.misaligned` gives the point on the axis to use: the nearest one, or the end-straight length in front of the port when the corner is closer than that or behind it.
- With no `via` the tube is one straight leg from `from` to `to`. A tube with no bends is exempt from the bend-radius and end-straight rules.
- `name` must be unique among the tubes of the script, with no comma, double quote or line break. It names the tube in diagnostics, in the report and in the bend-table file.
- Add the tube to the assembly with `asm.part(name, t)`, once, and no `at`. The same tube shape under a second part name fails `tube.part.duplicate`. A tube placed with `at`, or translated after routing, is reported by `tube.port.misaligned` because its ends left their ports.
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
| `clearance.pairs` | none | `[{ a, b, min }]`: mm between a tube of system `a` and a tube of system `b`, in either order. It replaces the default for that pair, so it may be lower as well as higher; when several pairs match, the largest `min` applies | `tube.clearance.violated`, `tube.clearance.pair-unused` |
| `systems` | none | `{ '<system>': { ...rules } }`: any of the four rule numbers above, for the tubes of that system only | the diagnostic of the rule, `tube.spec.system-unused` |

- Without `tubeSpec` the defaults apply and the result carries a `tube.spec.defaulted` warning. Declare `tubeSpec({})` to accept the defaults without the warning.
- `tubeSpec` rejects unknown keys, so a misspelt rule fails instead of being ignored.
- Every number may be a param: the four rule numbers, `clearance.default` and a pair's `min`, for example `tubeSpec({ minBendRadiusFactor: param('K', 3), clearance: { default: C } })`. The gate reads the param's current value and the messages print it. The value is checked when `tubeSpec` is called and again when the gate runs.
- A tube's system is its own `system`, else the system of the port it ends on.
- Clearance is measured surface to surface on the solids, in the solved assembly. Against the part that owns one of the tube's ends, a fitting zone at that end is left out of the measurement and the rest of the tube is measured. The zone is the end straight the rule requires, or `clearance.default` when that is longer, and never more than the end straight the tube has.
- A pair whose `a` or `b` is the system of no tube applies to nothing. It gives a `tube.clearance.pair-unused` warning that lists the systems present; the usual cause is a misspelt system name.
- A straight is what is left of a leg after the bends at its ends. A 90 degree bend uses `bendRadius` of each leg it joins, so a leg between two 90 degree bends needs `2 * bendRadius + minStraightBetweenBends * od`, and an end leg needs `bendRadius + minStraightAtEnd * od`. Size the legs from these before writing corners.

### Rules per system

One factor rarely fits every line. A 114.3 mm duct bent at 3 x OD needs a 343 mm radius; lowering the factor for the whole script lets a 6.35 mm line kink. Put the exception in `systems`:

```typescript
tubeSpec({
  minBendRadiusFactor: 3,
  minStraightAtEnd: 2.5,
  systems: {
    'hot-gas': { minBendRadiusFactor: 1.5, minStraightAtEnd: 1 },   // formed elbows on the large ducts
  },
  clearance: { default: 6 },
});
```

- An entry may set `minBendRadiusFactor`, `minStraightBetweenBends`, `minStraightAtEnd` and `maxBendAngle`. A rule it leaves out comes from the top level. Any other key fails; clearance between systems stays in `clearance.pairs`.
- The entry applies to every tube whose system has that name. Tubes of other systems, and tubes with no system, are checked exactly as without `systems`.
- The end-straight override also sets the fitting zone left out of clearance at the tube's ends, and the point `tube.port.misaligned` suggests.
- A value in an entry may be a param, like the top-level numbers.
- When a rule from an entry fails, the message names the value and the system: `the rule needs 171.45 mm (1.5 x OD 114.30, system 'hot-gas')`.
- An entry whose system no tube has gives a `tube.spec.system-unused` warning that lists the systems present.

## Reading the diagnostics

Two kinds of failure, both with measured values in the message.

Argument errors stop the script at the `tube`, `tubeSpec`, `connector` or `part.port` call. The code is `feature.invalid-args` and the message starts with a `tube.<reason>:` or `tubeSpec:` prefix:

| Prefix | What to change |
|---|---|
| `tube.name.invalid` | Use a unique, non-empty name with no comma, double quote or line break. |
| `tube.end.invalid` | Pass `part.port(name)`, `{ point, axis?, part? }` or `{ tube, at, axis }`: finite coordinates, a finite non-zero `axis`, a non-empty `part` or `tube` name, `at` as a number or a param. |
| `tube.via.invalid` | Pass `via` as an array of `[x, y, z]` corner points. |
| `tube.od.required` | Pass `od`, or end the tube on a port. |
| `tube.od.invalid`, `tube.wall.invalid`, `tube.bend-radius.invalid` | Pass a positive number; `wall` below `od / 2`. |
| `tube.port.od-mismatch` | Make the port sizes and `od` agree. |
| `tube.flow.invalid` | Pass `flow` as `{ lpm, fluid }` with a positive `lpm`, or leave it out. |
| `tube.flow.unknown-fluid` | Use one of the listed fluids, or leave `flow` out. |
| `tube.density.invalid` | Pass a positive `density` in kg/m^3, or name a material instead. |
| `tube.corner.unreachable` | A leg is too short for the bends at its ends. Lengthen the leg by the stated amount, or lower `bendRadius`. |
| `tube.corner.collinear-reversal` | The tube folds straight back on itself at a corner. Offset the next corner sideways. |
| `tube.corner.too-few-points` | The two ends are the same point. Give two distinct ends. |
| `tube.port.axis-required` | `port` data is only allowed on a connector with `type: 'axis'` and an `axis`. |
| `tube.port.invalid` | Pass `port: { system, od, minStraight? }` with a non-empty `system` and positive numbers, on a connector with a finite non-zero `axis`. |
| `tube.port.not-found`, `tube.port.not-a-port` | Register the connector before calling `part.port(name)`, with `port: { system, od }`. |
| `tube.port.unresolved` | The port has a face reference for an origin. Give it a `{ kind: 'vec3' }` origin, or pass `{ point, axis, part }` for that end. |
| `tube.branch.trunk-not-found` | Declare the trunk with `tube()` before the branch, and pass the name it was declared with. The message lists the tubes declared so far. |
| `tube.branch.system-mismatch` | Leave `system` out of the branch and end it on a port of the trunk's system. A line of another system needs its own trunk. |

Gate errors come after the build, as `tube.*` diagnostics. The script built, so the report is still there to read:

| Code | What to change |
|---|---|
| `tube.bend.radius-too-small` | Raise `bendRadius` to the stated value. If that radius does not fit and the shop can form the bend, lower the factor for that system in `systems`. |
| `tube.straight.between-bends-too-short` | Move the two corners of the named leg apart by the shortfall, or lower `bendRadius`. Legs are numbered from 0. |
| `tube.straight.end-too-short` | Move the first (or last) corner away from the port along the port axis by the shortfall. |
| `tube.bend.angle-exceeded` | Move the corner so the bend opens up, or add a corner to split it. Bends are numbered from 1. |
| `tube.port.misaligned` | "off the port axis" or "off the branch axis": put the corner where the message says. "from port" or "from its captured point": the part or the tube moved; route the end to the stated position as `{ point, axis, part }`, and add the tube with no `at`. "from part": the end does not touch the part it names; move the `point` onto the part's surface. "from its joint on tube": the trunk or the branch was moved after routing; add both with no `at`. |
| `tube.clearance.violated` | The message gives the closest point on the tube and the closest point on the other body. Move the corner nearest the first point away from the second by the shortfall (rule minus measured). At 0.00 mm from the part a plain end sits on, add `part` to that end. |
| `tube.clearance.pair-unused` (warning) | Correct the system name in `clearance.pairs` to one of the systems the message lists, or remove the pair. |
| `tube.spec.system-rule-invalid` | A param in a `systems` entry now gives a value the rule cannot be, and the top-level rule was applied. Fix the param, or use a plain number. |
| `tube.spec.rule-invalid` | A param in a top-level rule or clearance number now gives a value it cannot be; the message names the field and the value. The default was applied, and a clearance pair with such a `min` was left out. Fix the param, or use a plain number. |
| `tube.spec.system-unused` (warning) | Correct the system name in `systems` to one of the systems the message lists, or remove the entry. |
| `tube.clearance.overlap` | The tube passes through the named part or tube. Route the leg around it. Two tubes from one port: make the second a branch, `from: { tube, at, axis }`. |
| `tube.branch.not-on-straight` | `at` is on a bend of the trunk or beyond its end, and the branch was not built. Set `at` inside one of the straight ranges the message lists. |
| `tube.branch.too-close` | Move `at` into the range the message gives for that leg. When it says the leg is too short, put the tee on another leg or lengthen that one. |
| `tube.branch.axis-not-square` | Use the axis the message gives, and put the branch's first corner on it. |
| `tube.branch.od-too-large` | Lower the branch `od`, or make the larger line the trunk. |
| `feature.kernel-failed` with a `tube.gate:` message | The gate could not finish a check on the named tube, so that tube is not verified. The message carries the cause; check the tube's ends, its ports and the parts they sit on. |
| `tube.end.part-not-found` | Set `part` on that end to one of the part names the message lists, or remove it for an end in free space. |
| `tube.part.duplicate` | The same tube shape was added under two part names and only the first is checked. Declare a second `tube()` for the second line. |

A pair of tubes is reported once, on the tube declared first, so the corner to move may belong to the other tube named in the message.

## The loop

1. Write the parts and their ports, with no tubes yet, and evaluate: `evaluate_script`, or `kernelcad evaluate <file> --json`.
2. Read `ports`: every port's `origin` and `axis`. Write each tube's first and last corner from them (see "The port report").
3. Evaluate again. For each `tube.*` diagnostic, change the argument the table names by at least the stated amount.
4. Repeat until there are no errors, then read `tubes.lines[].minClearance` to see how much room each line has left (the field is absent for a tube with nothing near it), and check in `ports` that every port you meant to connect has the tube in `usedBy`.

## The port report

`evaluate_script` and `kernelcad evaluate <file> --json` (with or without `--envelope`) return a `ports` array whenever the script declares an assembly and builds a model (a script that throws while it runs has no `ports`). It does not need a tube: it is there for a script that only places parts, and when a gate fails. It lists the ports of the assembly the script returns, in the order the parts and connectors were declared. A dry run (`dryRun: true`) builds nothing and has no `ports`.

```json
"ports": [
  { "part": "pump", "name": "out-a", "system": "fuel", "od": 12.7, "minStraight": 20,
    "origin": [80, -110, -200], "axis": [0, 0, 1], "placedBy": "at", "usedBy": ["fuel-a"] }
]
```

| Field | Meaning |
|---|---|
| `part`, `name` | the part that owns the port and the connector name: `pump.port('out-a')` |
| `system`, `od`, `minStraight` | as declared on the port; `minStraight` only when the port declares one |
| `origin` | port position in assembly space, mm, with params resolved and mates solved |
| `axis` | unit vector pointing out of the part, in assembly space |
| `placedBy` | `at`: the part is where its `at` puts it, and `part.port(name)` gives this position. `connect`: the part is where its `connect` puts it, and `part.port(name)` gives this position. `mate`: a mate moved or turned the part after that; `origin` and `axis` are the solved ones, and `part.port(name)` still gives the position before the mate |
| `usedBy` | names of the tubes that end on the port, `[]` when it is free. A plain `{ point }` end counts when it sits within 0.01 mm of `origin` |
| `unresolved` | why there is no position; `origin`, `axis` and `placedBy` are then left out |

`connect` places a part once, from the two connectors as declared. It does not follow a mate: when a mate moves the parent, the part placed with `connect` stays where it was. `ports` gives where each one is.

A mate's transform is applied on top of `at`. A part that is both placed with `at` and moved by a mate lands at `at` plus the mate's offset, not where either one alone would put it. Read `ports` for the real position.

Placing corners from a port:

- First corner of a tube that leaves the port: `origin + L * axis`. `L` is at least `bendRadius + minStraightAtEnd * od` for a 90 degree bend (use the port's `minStraight` in place of `minStraightAtEnd * od` when it is longer).
- Last corner of a tube that arrives at a port: the same formula with that port's `origin` and `axis`.
- For `placedBy: 'at'` or `'connect'`, end the tube with `part.port(name)`. For `placedBy: 'mate'`, end it with `{ point: origin, axis, part }`.
- `origin` is a number for this evaluation. If a param moves the part, write the corner from the same param (`[X.add(20), -110, -120]`), or the corner stays behind when the param changes.

`unresolved` is one of:

| Text starts with | Cause |
|---|---|
| `no built assembly` | the script does not build this assembly: it never calls `asm.model()` or `asm.solvedModel(...)`, or it throws before reaching that call. Fix the error in `diagnostics`, or return `asm.model()` |
| `part '<name>' failed to build` | the part's own shape has an error. Fix it in `diagnostics`; the port is where it was declared once the part builds |
| `the assembly was not built ..., so the solve did not run` | another part failed, and this part is positioned by a mate or a joint, or placed with `connect`. Fix the failed part named in the text |
| `part '<name>' is not in the built assembly` | the part did not make it into the scene |
| `the connector origin is a face, edge or vertex reference` | give the port a `{ kind: 'vec3' }` origin |

When one part fails to build, the assembly is not built and no mate is solved. A port on a part that is placed with `at` and that no mate or joint refers to is still listed with its position (`placedBy: 'at'`), so the routes to the good parts can be checked while the failed part is fixed.

A port that nothing connects to is not an error. Two tubes in one `usedBy` are the two-tubes-from-one-port case and fail `tube.clearance.overlap`; make the second tube a branch of the first (see "Branches"). A branch end is not on a port and is in no `usedBy`.

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
| `minClearance` | `{ mm, to, at }`: distance to the nearest part or tube, its name, and the closest point on this tube. Between a branch and its own trunk the distance leaves out the joint zone. Absent when there is nothing around the tube to measure against |
| `massKg` | tube mass, or `null` without a known material or a `density` |
| `volumeInternalMl` | bore volume |
| `pressureDropKPa` | estimate for the declared `flow`, or `null` without one |
| `from`, `to` | `{ tube, at }` when that end is a branch end: the trunk's name and the station on it, mm. Absent for any other end. `cutLength`, `xyz` and `lra` of the tube then start on the trunk wall |
| `branches` | `[{ tube, at }]`: the tubes that branch off this one, by station. Absent when there are none |

`tubes.systems[]` has one row per system: `system`, `lines`, `cutLength`, `massKg`.

## Bend-table export

```bash
kernelcad export bend-table line.kcad.ts -o out/bend-tables
```

`-o` is a directory. The export writes one CSV per tube, named after the tube: a header with the name, OD, wall, bend radius and cut length, then the XYZ points, then the bend rows and the last straight. A trunk's file ends with a `branch,at_mm` section, one row per branch with its station. A branch's header has the trunk's name and the station after the cut length, as two rows. A branch joined at its start has the `from` rows; one joined at its end has the `to` rows:

```text
from_tube,trunk
from_at_mm,180.000
```

From MCP: `export({ format: 'bend-table', output_path: 'out/bend-tables', code })`.

The export is refused when the build or a tube gate reports an error; fix the route first. A script with no tube gives `export.bend-table.no-tubes`.

`inspect({ of: 'bend-table' })` is the sheet-metal bend table, not this one.

## Verification gates

| Gate | Pass criterion |
|------|----------------|
| G-eval | `kernelcad evaluate` exits 0 with no `tube.*` error and no `feature.invalid-args` |
| G-spec-declared | no `tube.spec.defaulted` warning: the script calls `tubeSpec` |
| G-lines-present | `tubes.lines` has one entry per tube you meant to route, each with the system you expect |
| G-ports-connected | every port you meant to connect has its tube in `ports[].usedBy`, and no port has `unresolved` |
| G-branches-joined | every branch has `from` or `to` with the trunk you meant, and the trunk lists it in `branches` |
| G-clearance-margin | every `minClearance.mm` is at or above the rule for that pair; a line with no `minClearance` has no neighbour, which is a pass only if you expected none |
| G-render | a render shows every tube leaving its boss square and passing through no part, and every branch sitting on its trunk |

## Related skills

- `kernelcad-assemblies`: parts, `at`, connectors and mates that the ports sit on.
- `kernelcad-params`: `at`, `via`, `od`, `wall` and `bendRadius` accept params, so a moved part moves the tube end.
- `kernelcad-sheet-metal`: folded sheet parts and their own bend table.
- `kernelcad-repair`: the repair loop when an evaluation reports an error.
