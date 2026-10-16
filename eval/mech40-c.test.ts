// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// mech40 reference solutions pass their own checkers (part c).
// Shared suite: eval/mech40Suite.ts. Task set: eval/tasks/mech40, see eval/README.md.

import { defineMech40Suite } from './mech40Suite';

defineMech40Suite([
  '21-shaft-collar-set-screw',
  '22-d-shaft-knob',
  '23-spur-gear-24t',
  '24-spur-gear-pair',
  '25-gear-with-hub-set-screw',
  '26-print-in-place-hinge',
  '27-hinged-lid-box',
  '28-two-link-arm',
  '29-sheet-l-bracket-flat',
  '30-sheet-down-tab-flat',
]);
