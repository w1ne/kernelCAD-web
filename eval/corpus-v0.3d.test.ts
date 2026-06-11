// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// v0.3 corpus — expert solutions score 100% (part d).
//
// Split out of corpus-v0.3.test.ts for CI shard balance (per-file vitest
// sharding). Shared harness: eval/corpusExpertSuite.ts.

import { defineExpertCorpusSuite } from './corpusExpertSuite';

defineExpertCorpusSuite({
  describeTitle: 'v0.3 corpus — expert solutions score 100%',
  tmpPrefix: 'eval-corpus-v0.3-',
  startedAt: 'CORPUS-V03',
  tasks: [
    // W2.1 — patterns
    { id: 'circular-hole-array-around-hub',   dir: './eval/tasks/circular-hole-array-around-hub' },
    { id: 'grid-heat-sink-fin-array',         dir: './eval/tasks/grid-heat-sink-fin-array' },
  ],
});
