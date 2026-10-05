---
id: union-of-stacked-primitives
title: Compose multiple primitives by translate then union
tags: [boolean, union, translate, stacking, primitive]
keywords:
  - stack two boxes
  - join multiple parts with union
  - compose primitives without overlap
when_to_use: >-
  Simple blockouts only — compose primitives by translate+union without overlap.
  NOT for real / production / complex / enclosure / gearbox / bearing housing /
  robot-arm prompts (use multi-feature-machined-housing or
  multi-body-mechanism-real-proportions instead).
---

```typescript
const lower = box(30, 30, 10);
const upper = box(20, 20, 10).translate(5, 5, 10);
return lower.union(upper);
```

Stacked primitives must touch (shared face) or overlap: a `union()` whose
operands do not touch fails `evaluate_script` with `union.disconnected`
(the message names the floating operand and the gap). Operands that each
carry their own `.finish()` are treated as separate members and must not
overlap by more than 1 mm³ (`union.member-overlap`) — see
`welded-tube-frame-tray` for frames.

Do not use this pattern to attach wide boxes onto a freeform loft / rail-loft
body — that boolean often self-intersects. Keep aero appendages as separate
parts (see `automotive-body-envelope`).

For Adam-level mechanical parts, prefer `lookup_cookbook("multi-feature machined housing")`
or `lookup_cookbook("multi-body mechanism real proportions")` — stacked boxes are toys.
