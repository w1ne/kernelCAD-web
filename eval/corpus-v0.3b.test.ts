// v0.3 corpus — expert solutions score 100% (part b).
//
// Split out of corpus-v0.3.test.ts for CI shard balance (per-file vitest
// sharding). Shared harness: eval/corpusExpertSuite.ts.

import { defineExpertCorpusSuite } from './corpusExpertSuite';

defineExpertCorpusSuite({
  describeTitle: 'v0.3 corpus — expert solutions score 100%',
  tmpPrefix: 'eval-corpus-v0.3-',
  startedAt: 'CORPUS-V03',
  tasks: [
    { id: 'through-slot',             dir: './eval/tasks/through-slot' },
    // slice 2 — named features + ordinal fallback + snapshot fallback
    { id: 'named-feature-disambiguation',     dir: './eval/tasks/named-feature-disambiguation' },
    { id: 'ordinal-feature-fallback',         dir: './eval/tasks/ordinal-feature-fallback' },
    { id: 'named-bore-survives-transform',     dir: './eval/tasks/named-bore-survives-transform' },
  ],
});
