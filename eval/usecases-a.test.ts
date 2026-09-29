// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Typical use cases — expert solutions pass every harness check (part a).
// Shared suite: eval/usecaseSuite.ts. Cases and how to add one:
// eval/tasks/USECASES.md.

import { defineUsecaseSuite } from './usecaseSuite';

defineUsecaseSuite([
  { id: 'usecase-sensor-bracket' },
  { id: 'usecase-edit-bracket' },
  { id: 'usecase-nema17-mount' },
  { id: 'usecase-gridfinity-bin' },
  { id: 'usecase-stove-knob' },
  { id: 'usecase-drill-jig' },
]);
