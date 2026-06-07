// v0.3 corpus — expert solutions score 100% (part c).
//
// Split out of corpus-v0.3.test.ts for CI shard balance (per-file vitest
// sharding). Shared harness: eval/corpusExpertSuite.ts.

import { defineExpertCorpusSuite } from './corpusExpertSuite';

defineExpertCorpusSuite({
  describeTitle: 'v0.3 corpus — expert solutions score 100%',
  tmpPrefix: 'eval-corpus-v0.3-',
  startedAt: 'CORPUS-V03',
  tasks: [
    // slice 3 — symbolic params + edit-after-build replay
    { id: 'param-edit-bolt-diameter',         dir: './eval/tasks/param-edit-bolt-diameter' },
    { id: 'param-gate-cable-port',            dir: './eval/tasks/param-gate-cable-port' },
    // W2.1 — patterns
    { id: 'linear-bolt-pattern-on-plate',     dir: './eval/tasks/linear-bolt-pattern-on-plate' },
  ],
});
