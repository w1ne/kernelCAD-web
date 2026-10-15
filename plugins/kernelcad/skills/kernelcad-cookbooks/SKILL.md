---
name: kernelcad-cookbooks
description: Find and run kernelCAD cookbook recipes (machined housing, NEMA motor plate, robot arm, planetary gearbox, T-slot frame, enclosures) through the hosted MCP. Use before freehand authoring of an industry part.
---

# kernelCAD cookbooks

1. `lookup_cookbook({ query: "<what the user wants>", k: 5 })` returns ranked
   recipes `{ ok, hits[] }`. Empty `hits` is a valid answer: author freehand.
2. Run a hit in one step: `execute_cookbook({ id, openInStudio: false })`.
   Read `stage` on failure (`resolve` | `evaluate` | `open_in_studio`).
   `dryRun: true` is not proof that the recipe builds a solid.
3. Adapt the returned `code` to the user's dimensions, then go through the
   `kernelcad-design-loop` skill.

Useful ids: `multi-feature-machined-housing`, `nema-motor-mounting-plate`,
`multi-body-mechanism-real-proportions`, `multi-dof-robot-arm-4axis`,
`planetary-gearbox-shop-release`, `gt2-shop-release-actuator`,
`clamshell-enclosure-release-pack`, `tslot-frame-fastener-bom`,
`scissor-lift-closed-loop`, `holeless-board-cradle` (no-hole development board rail and connector opening).
