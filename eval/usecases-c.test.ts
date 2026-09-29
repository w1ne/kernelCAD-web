// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Typical use cases — expert solutions pass every harness check (part c).
// Shared suite: eval/usecaseSuite.ts. Cases and how to add one:
// eval/tasks/USECASES.md.

import { defineUsecaseSuite } from './usecaseSuite';

// usecase-bolt-nut (U11) is not listed: its modeled 24-turn threads take
// minutes per build, too slow for a per-PR shard. See eval/tasks/USECASES.md.
defineUsecaseSuite([
  { id: 'usecase-rpi4-enclosure' },
  { id: 'usecase-twisted-vase' },
]);
