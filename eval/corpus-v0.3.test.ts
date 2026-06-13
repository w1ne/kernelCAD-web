// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// v0.3 corpus — expert solutions score 100%.
//
// NOTE: companion files corpus-v0.3b.test.ts / corpus-v0.3c.test.ts /
// corpus-v0.3d.test.ts were split out for CI shard balance (per-file
// vitest sharding); the 13-task corpus is partitioned into four files of
// roughly equal measured cost. Shared harness: eval/corpusExpertSuite.ts.

import { defineExpertCorpusSuite } from './corpusExpertSuite';

defineExpertCorpusSuite({
  describeTitle: 'v0.3 corpus — expert solutions score 100%',
  tmpPrefix: 'eval-corpus-v0.3-',
  startedAt: 'CORPUS-V03',
  tasks: [
    { id: 'single-counterbored-hole', dir: './eval/tasks/single-counterbored-hole' },
    { id: 'bolt-pattern-4',           dir: './eval/tasks/bolt-pattern-4' },
    { id: 'mixed-fastener-plate',     dir: './eval/tasks/mixed-fastener-plate' },
    { id: 'keyhole-cutout',           dir: './eval/tasks/keyhole-cutout' },
  ],
});
