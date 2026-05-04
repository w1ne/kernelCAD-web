# Repo conventions for Claude Code agents working in kernelCAD-web

## Demo discipline (v0.X.0-tag PR review rule)

When reviewing a PR that ships a `v0.X.0` tag (cuts a per-module release):

1. Verify `docs/demos/v0.X/<task>/whats-new.md` contains a `## Hero artifact` section, a `## Why memorable` section with all three bullets filled (no `TODO:`), and a `## What's new` section.
2. Verify `docs/demos/v0.X/<task>/meta.json` contains `heroArtifact`, `catalogSource`, and `overrideApprovedBy` keys.
3. Verify the §1 bar of [`docs/superpowers/specs/2026-05-04-memorable-builds-policy-design.md`](docs/superpowers/specs/2026-05-04-memorable-builds-policy-design.md) is satisfied by the *artifact itself*, not by the prose. If `heroArtifact` is generic (box, bracket, plate, etc.) or the new tool isn't visibly central to the build, fail the review and cite the policy spec.
4. If `meta.json.overrideApprovedBy` is non-null, the override path was used. Surface this to the controller for traceability — it is not automatically a fail, but should not be a default.

This rule binds the `superpowers:code-reviewer` agent and any human reviewer working in this repo.
