# Shared selection handoff

Local Studio and MCP share a single face/edge selection per pooled session.
Selection writes require the model generation returned by `get_selection`;
rebuilds clear picks and reject stale writes. Hosted route integration belongs
to the separate server repository.

See [usage and limits](../../guide/shared-selection.md). Demo media, evidence
files and helper scripts were removed during PR review. No production
deployment or hardware acceptance is claimed.
