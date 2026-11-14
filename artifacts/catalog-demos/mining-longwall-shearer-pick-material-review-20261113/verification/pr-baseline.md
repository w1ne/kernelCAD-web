# PR and duplicate-target checks — 2026-11-13

- PR #1258 was open at baseline head a5cdd48795aab954f093077c62f55b43c505e503. All 17 reported checks passed before this round's edit.
- GitHub reported no submitted review (`reviews: []`, empty review decision).
- Exact open PR and issue searches for longwall-shearer, mine-ventilation-fan, spiral-concentrator, gyratory-crusher-station and jaw-crusher-module returned no results. PR #1258 is the destination for this work and was excluded from the “other open target” check.
- Open PR #1215 covers industrial-plant; it does not target these mining assets. The named PRs #1298, #1305, #1307 and #1308 were checked and are merged; their titles target a substation cable ladder, sanitary pump, storage array, and split shaft collar respectively.
- The public kernelCAD route for mining/longwall-shearer returned HTTP 200. It served the older 224-triangle preview and short description, not this branch's 3,504-triangle model. This branch is not deployed.

The current index rebuild changed only the longwall-shearer row. Its source hash is fresh and its preview path exists; see index-verification.json.
