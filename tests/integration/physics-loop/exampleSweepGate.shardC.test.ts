// Physics-loop example-sweep gate — LIVE per-example partition C (shard 2 of SHARD_COUNT).
//
// Spec:  docs/specs/2026-06-01-physics-grounded-loop-design.md (slice P3)
// Plan:  docs/plans/2026-06-01-physics-loop-P3-sweep-and-demote.md (Task 5)
//
// This file runs the HEAVY `runValidateCli({ includeInterference: true })`
// loop check for the index-2-mod-SHARD_COUNT slice of the live-sweep
// example set. The set was one ~370s sequential loop in exampleSweepGate.test.ts;
// it is now partitioned across exampleSweepGate.shard{A,B,C,D}.test.ts so vitest
// distributes the work across its per-FILE CI shards. Coverage is IDENTICAL —
// the four partitions together cover exactly `discoverSweepExamples()`, the same
// set the original loop ran. The fast structural completeness checks live in
// exampleSweepGate.test.ts and guarantee nothing falls out of that set silently.

import { registerSweepShard } from './exampleSweepShared';

registerSweepShard('C', 2);
