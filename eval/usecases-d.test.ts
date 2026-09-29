// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Typical use cases — expert solutions pass every harness check (part d).
// Shared suite: eval/usecaseSuite.ts. Cases and how to add one:
// eval/tasks/USECASES.md.

import { defineUsecaseSuite } from './usecaseSuite';

// Modeled 23-turn threads: about three minutes on its own, so its own file.
defineUsecaseSuite([
  { id: 'usecase-bolt-nut', budgetMs: 480_000 },
]);
