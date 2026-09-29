// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Typical use cases — expert solutions pass every harness check (part b).
// Shared suite: eval/usecaseSuite.ts. Cases and how to add one:
// eval/tasks/USECASES.md.

import { defineUsecaseSuite } from './usecaseSuite';

const GEAR_RECIPE = 'https://github.com/w1ne/kernelCAD-web/issues/805';
const STL_SEAMS = 'https://github.com/w1ne/kernelCAD-web/issues/807';

defineUsecaseSuite([
  {
    id: 'usecase-spur-gear-pair',
    open: { 'cookbook involute-spur-gear-pair recipe builds closed solid gears': GEAR_RECIPE },
  },
  { id: 'usecase-keychain' },
  { id: 'usecase-floor-plan' },
  { id: 'usecase-plywood-shelf' },
  { id: 'usecase-robot-arm', open: { 'STL exports (whole model)': STL_SEAMS } },
]);
