# Shared selection handoff

Local Studio and MCP share a single face/edge selection per pooled session.
Selection writes require the model generation returned by `get_selection`;
rebuilds hide picks while Studio uniquely remaps face signatures, clear deleted
or ambiguous faces, and reject stale writes. Hosted route integration belongs
to the separate server repository.

See [usage and limits](../../guide/shared-selection.md) and the [stable-face
selection protocol replay](../stable-face-selection/README.md). This replay is
local protocol validation; no production deployment or hardware acceptance is
claimed.
