# Pushed-commit CI result

- Commit: `5c42a991c28bf41b6c811af739187ee904f551b6`
- Workflow: [CI run 44417158008](https://github.com/w1ne/kernelCAD-web/actions/runs/44417158008)
- Trigger: `workflow_dispatch` on `feat/catalog-2000`; automatic synchronization did not create a run for the pushed draft PR.
- Catalog index freshness and changed-source preview gate: passed.
- Build/typecheck, lint, geometry proofs, reference-parts, SolidCraft, external tools, and seven of eight test shards: passed.
- Overall suite: failed in `test-shard (3/8)` at `tests/unit/scripts/qualityRatchet.test.ts`. The test reports `src/modeling/capture/proxy.ts` as a new `max-lines=820` finding. This catalog commit does not touch the file; it is 1,576 lines in the pushed branch and 1,498 lines at current `origin/develop`. Both exceed the threshold. `scripts/lib/qualityBaseline.json` and the quality-ratchet test are identical between branch and `origin/develop`, so this run exposed a ratchet finding unrelated to the asset fix.
- The failing shard had 1,570 passing tests, one failing ratchet test, and four skipped tests. The excerpt is in `ci-failure-excerpt.txt`.

This full dispatch result is recorded separately from the earlier draft-light PR run. No unrelated runtime source was changed to mask the ratchet finding.
