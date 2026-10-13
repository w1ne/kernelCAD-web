# MCP self-install

Agent setup is documented in `site/llms.txt` and
[the installation guide](../../usage/agent-plugin-install.md).

The npm CLI build stamps bundled skill documents with the package version.
Tests cover current-version matching, nested skills and package version bumps.
No deployment or hardware acceptance is claimed by this change.

Review validation (2026-10-13): 68 focused feature tests and 13 real-tree quality
and cycle ratchet tests passed. CLI build, typecheck and lint passed; lint had
0 errors and 29 existing warnings. The stdio transport fix is outside this PR.
