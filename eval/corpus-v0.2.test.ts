// v0.2 tracked-refs corpus — expert solutions score 100%.
//
// NOTE: companion file corpus-v0.2.labeled.test.ts was split out for CI
// shard balance (per-file vitest sharding); the labeled-* tasks live
// there. Shared harness: eval/corpusExpertSuite.ts.

import { defineExpertCorpusSuite } from './corpusExpertSuite';

defineExpertCorpusSuite({
  describeTitle: 'v0.2 tracked-refs corpus — expert solutions score 100%',
  tmpPrefix: 'eval-corpus-v0.2-',
  startedAt: 'CORPUS-V02',
  tasks: [
    { id: 'fillet-translated-box', dir: './eval/tasks/fillet-translated-box' },
    { id: 'subtract-then-fillet-rim', dir: './eval/tasks/subtract-then-fillet-rim' },
    { id: 'chamfer-rotated-wedge', dir: './eval/tasks/chamfer-rotated-wedge' },
  ],
});
