// v0.2 tracked-refs corpus — labeled-* tasks.
//
// Split out of corpus-v0.2.test.ts for CI shard balance (per-file vitest
// sharding). Shared harness: eval/corpusExpertSuite.ts.

import { defineExpertCorpusSuite } from './corpusExpertSuite';

defineExpertCorpusSuite({
  describeTitle: 'v0.2 tracked-refs corpus — expert solutions score 100%',
  tmpPrefix: 'eval-corpus-v0.2-',
  startedAt: 'CORPUS-V02',
  tasks: [
    { id: 'labeled-bracket-fillet', dir: './eval/tasks/labeled-bracket-fillet' },
    { id: 'labeled-cylinder-shell', dir: './eval/tasks/labeled-cylinder-shell' },
  ],
});
