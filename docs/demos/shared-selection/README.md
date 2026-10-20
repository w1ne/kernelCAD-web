# Shared selection handoff

Local Studio and MCP share a primary face/edge pick plus a topology
multi-selection per pooled session. Edge picks include geometry-derived stable
IDs and operation-ready refs; face picks keep the existing signature remap.
Selection writes require the model generation returned by `get_selection`.
Hosted route integration belongs to the separate server repository.

See [usage and limits](../../guide/shared-selection.md), the [stable-face
selection protocol replay](../stable-face-selection/README.md), and the
[edge-picking workflow demo](../edge-picking/README.md). The existing replay is
local protocol validation; no production deployment or hardware acceptance is
claimed.
