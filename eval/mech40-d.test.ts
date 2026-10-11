// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// mech40 reference solutions pass their own checkers (part d).
// Shared suite: eval/mech40Suite.ts. Task set: eval/tasks/mech40, see eval/README.md.

import { defineMech40Suite } from './mech40Suite';

defineMech40Suite([
  '31-sheet-45-bracket-flat',
  '32-tapped-rail-block',
  '33-countersunk-plate',
  '34-board-edge-drill-guide',
  '35-drilling-template-pins',
  '36-vise-soft-jaw-vgroove',
  '37-fixture-plate-m6-grid',
  '38-fdm-pin-running-fit',
  '39-bearing-608-press-seat',
  '40-hex-nut-trap-clamp',
]);
