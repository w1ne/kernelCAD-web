// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Typical use cases — expert solutions pass every harness check (part b).
// Shared suite: eval/usecaseSuite.ts. Cases and how to add one:
// eval/tasks/USECASES.md.

import { defineUsecaseSuite } from './usecaseSuite';

const ORPHAN_GATE = 'https://github.com/w1ne/kernelCAD-web/issues/804';
const GEAR_RECIPE = 'https://github.com/w1ne/kernelCAD-web/issues/805';

defineUsecaseSuite([
  {
    id: 'usecase-spur-gear-pair',
    open: {
      'evaluate_script accepts the parts (mechanism gate on)': ORPHAN_GATE,
      'cookbook involute-spur-gear-pair recipe builds closed solid gears': GEAR_RECIPE,
    },
  },
]);
