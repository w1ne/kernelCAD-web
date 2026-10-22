# Agent instructions

Read [CLAUDE.md](CLAUDE.md) for repository conventions and [docs/DEPLOY.md](docs/DEPLOY.md)
before deployment.

For every new or materially changed feature/tool:

- Check current official websites, documentation and demonstrations of comparable
  workflows before design or implementation. Record dated comparisons privately in
  kernelCAD-private; keep public artifacts framed as native kernelCAD behavior.
- Check the current kernelCAD website and existing source to avoid duplicate features.
  Update the relevant documentation/example and verify its public page after deployment.
- Create a small, readable MP4 demo of the actual feature workflow and result. Retain
  source, invocation/settings and verification evidence, inspect the video, and link
  the bundle from the feature's handoff. This applies to individual features/tools,
  including minor changes, analysis and distribution work.
- Keep replay, simulation, local validation, deployed behavior and hardware acceptance
  distinct in demo captions and completion claims.

Before browser work inspect and reuse an already-running Chrome/Chromium or CDP
session and its login/profile. A missing automation connection does not justify a
duplicate browser. Give attachment helpers a fixed lifetime and idle timeout; stop
only their owned processes after each check and keep the user's browser running.

## Commercial source boundary

This repository owns reusable CAD/kernel/tooling and the generic renderer. Hosted product UI, billing/checkout/entitlements, supplier quotes/routing/integrations, commissions, commercial orchestration and proprietary manufacturing policy belong in private repositories, including their tests, fixtures and strategy. Mixed modules stay private until reusable geometry is separated. Audit both source and built npm artifacts; do not restore product deployment workflows or package exports here.
