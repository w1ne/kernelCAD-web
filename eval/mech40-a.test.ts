// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// mech40 reference solutions pass their own checkers (part a).
// Shared suite: eval/mech40Suite.ts. Task set: eval/tasks/mech40, see eval/README.md.

import { defineMech40Suite } from './mech40Suite';

defineMech40Suite([
  '01-plate-four-corner-holes',
  '02-flange-bolt-circle',
  '03-perforated-panel-grid',
  '04-slotted-adjust-plate',
  '05-nema17-motor-plate',
  '06-mounting-strip-hole-row',
  '07-l-bracket-holes',
  '08-l-bracket-gusset',
  '09-shaft-support-counterbored',
  '10-tube-socket-bracket',
]);
