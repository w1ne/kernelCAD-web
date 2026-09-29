// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Typical use cases — expert solutions pass every harness check (part b).
// Shared suite: eval/usecaseSuite.ts. Cases and how to add one:
// eval/tasks/USECASES.md.

import { defineUsecaseSuite } from './usecaseSuite';

const ORPHAN_GATE = 'https://github.com/w1ne/kernelCAD-web/issues/804';
const GEAR_RECIPE = 'https://github.com/w1ne/kernelCAD-web/issues/805';
const DXF_3D = 'https://github.com/w1ne/kernelCAD-web/issues/806';

defineUsecaseSuite([
  {
    id: 'usecase-spur-gear-pair',
    open: {
      'evaluate_script accepts the parts (mechanism gate on)': ORPHAN_GATE,
      'cookbook involute-spur-gear-pair recipe builds closed solid gears': GEAR_RECIPE,
    },
  },
  { id: 'usecase-keychain', open: { 'evaluate_script accepts the parts (mechanism gate on)': ORPHAN_GATE } },
  { id: 'usecase-floor-plan', open: { 'DXF plan section exports': DXF_3D } },
  {
    id: 'usecase-plywood-shelf',
    open: {
      'DXF has the flat outline of every part': DXF_3D,
      'evaluate_script accepts the parts (mechanism gate on)': ORPHAN_GATE,
    },
  },
]);
