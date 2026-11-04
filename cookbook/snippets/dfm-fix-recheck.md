---
id: dfm-fix-recheck
title: Apply one DFM parameter edit and review again
tags: [manufacturing]
keywords:
  - dfm_fix_recheck
  - one safe shell thickness edit then the same review
  - raise an existing draft angle to the named minimum
  - manufacturability finding with a bounded parameter bump
  - persist new_code after the recheck
when_to_use: >-
  dfm_review failed or warned and the fix is one existing feature argument:
  shell thickness, fillet radius, or draft angle. Call dfm_fix_recheck with
  the same process options. It applies at most one edit and runs that review
  again. Persist new_code only when applied is true. Sharp corners, undrafted
  faces, and unrelated dimensions stay as suggestions.
---

A wall thinner than two nozzle diameters. `dfm_fix_recheck` with
`processes: ['fdm']` raises this `shell()` thickness to the named minimum
plus 0.01 mm and reviews the edited source. The snippet below is the
script you pass in. The tool returns the revision as `new_code` and does
not write it.

```typescript
// Starting script for dfm_fix_recheck. The 0.3 mm shell is under a 0.4 mm nozzle.
return box(40, 30, 10).shell(0.3, { face: 'top' });
```
