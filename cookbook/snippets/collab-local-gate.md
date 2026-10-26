---
id: collab-local-gate
title: Gate a branch edit before merging a multi-agent assembly change
tags: [collaboration, merge, gate, requirement, cli, assembly]
keywords:
  - agent worktree merge check
  - local merge queue
  - branch conflicts before merge
  - collab check command
when_to_use: You edited a shared assembly on a branch or worktree and need to know whether it still merges with head and keeps every requirement that passed at head green, before opening or merging a PR.
example: examples/collab/bracket-and-motor-plate.kcad.ts
---

```typescript
// Run from the repository; sources come from git, not the working tree.
//   kernelcad collab check \
//     --file examples/collab/bracket-and-motor-plate.kcad.ts \
//     --base origin/develop --head origin/develop \
//     --yours my-branch --out merged.kcad.ts --json
//
// Exit 0 = pass. Exit 1 = collab.conflict.* (structural) or
// collab.gate.* (feature, binding or requirement) in the JSON report.
```
