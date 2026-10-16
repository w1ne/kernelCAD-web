// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// mech40 reference solutions pass their own checkers (part b).
// Shared suite: eval/mech40Suite.ts. Task set: eval/tasks/mech40, see eval/README.md.

import { defineMech40Suite } from './mech40Suite';

defineMech40Suite([
  '11-clevis-bracket',
  '12-project-box-with-lid',
  '13-rpi4-case-base',
  '14-pcb-tray-standoffs',
  '15-shelled-enclosure',
  '16-enclosure-slip-fit-lid',
  '17-vented-cover',
  '18-cylindrical-container',
  '19-rpi5-mount-plate',
  '20-shaft-coupler-5-8',
]);
