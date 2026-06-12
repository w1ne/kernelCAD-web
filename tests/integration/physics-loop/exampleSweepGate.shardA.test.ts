// Physics-loop example-sweep gate — LIVE per-example partition A (shard 0 of SHARD_COUNT).
//
// Spec:  docs/specs/2026-06-01-physics-grounded-loop-design.md (slice P3)
// Plan:  docs/plans/2026-06-01-physics-loop-P3-sweep-and-demote.md (Task 5)
//
// This file runs the HEAVY `runValidateCli({ includeInterference: true })`
// loop check for the index-0-mod-SHARD_COUNT slice of the live-sweep
// example set. The set was one ~370s sequential loop in exampleSweepGate.test.ts;
// it is now partitioned across exampleSweepGate.shard{A,B,C,D}.test.ts so vitest
// distributes the work across its per-FILE CI shards. Coverage is IDENTICAL —
// the four partitions together cover exactly `discoverSweepExamples()`, the same
// set the original loop ran. The fast structural completeness checks live in
// exampleSweepGate.test.ts and guarantee nothing falls out of that set silently.

import { describe, it } from 'vitest';
import {
  SHARD_COUNT,
  discoverSweepExamples,
  assertExampleLoopClean,
  PER_EXAMPLE_TIMEOUT_MS,
} from './exampleSweepShared';

const SHARD_INDEX = 0;

describe('example-sweep gate partition A (live runValidateCli, shard 0)', () => {
  const partition = discoverSweepExamples().filter((_, i) => i % SHARD_COUNT === SHARD_INDEX);

  for (const examplePath of partition) {
    it(
      `${examplePath} passes the physics-grounded loop`,
      async () => {
        await assertExampleLoopClean(examplePath);
      },
      PER_EXAMPLE_TIMEOUT_MS,
    );
  }
});
