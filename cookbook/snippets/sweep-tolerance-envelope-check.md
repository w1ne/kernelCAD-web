---
id: sweep-tolerance-envelope-check
title: Sweep a param across a tolerance range and re-check the standard gates
tags: [assembly, connector, mate, revolute, hinge, joint, sweep-tolerance, tolerance, parameter, kinematic]
keywords:
  - does this design still clear at the worst-case tolerance
  - sweep a dimension and re-validate
  - tolerance stackup check
  - parameter sweep gates
  - sweepTolerance
  - find the param value where the design breaks
  - cartesian product of param values
when_to_use: >-
  A design has a param() whose real-world value varies (a printed hole
  that comes out oversized, a clearance gap that shrinks under tolerance)
  and you need to know whether the mechanism stays buildable across that
  range, not just at the nominal value. Call
  kinematic.sweepTolerance({ code|file, params, gates }) with one or more
  param names as { values: [...] } or { min, max, steps }; it re-evaluates
  the script per cartesian-product combo (capped at 64) and runs the
  interference / mounting-hole / joint-axis gates (default on) plus
  reachability when declared, returning a pass/fail table and the first
  failing combo per gate.
---

```typescript
const result = await kinematic.sweepTolerance({
  code: `
    const arm = assembly('clearance-check');
    const gap = param('GapMm', 5);
    const a = box(20, 20, 20, true);
    const b = box(20, 20, 20, true).translate(gap.add(20), 0, 0);
    arm.part('a', a);
    arm.part('b', b);
    return arm.solvedModel({});
  `,
  params: { GapMm: { values: [5, 2, 0, -2] } },
  gates: { interference: true, mountingHoles: false, jointAxis: false },
});

// result.results[i] => { combo: { GapMm }, gates: { interference: 'pass'|'fail' }, diagnostics }
// result.firstFailure.interference => the first combo (in declaration order) that overlaps
```
