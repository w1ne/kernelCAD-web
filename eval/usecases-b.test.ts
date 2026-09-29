// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Typical use cases — expert solutions pass every harness check (part b).
// Shared suite: eval/usecaseSuite.ts. Cases and how to add one:
// eval/tasks/USECASES.md.

import { defineUsecaseSuite } from './usecaseSuite';

defineUsecaseSuite([
  { id: 'usecase-spur-gear-pair' },
  { id: 'usecase-keychain' },
  { id: 'usecase-floor-plan' },
  { id: 'usecase-plywood-shelf' },
  { id: 'usecase-robot-arm' },
]);
