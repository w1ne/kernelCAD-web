# Phase 3 — Versioned mesh artifact (design)

Status: scaffolded hooks only in the viewer/embed PRs. Full pipeline is a follow-up.

## Goal

Evaluate CAD once → persist a versioned build artifact (mesh + preview + diagnostics/bounds) → Studio viewer / embed loads the mesh and does **not** recompile CAD.

## Cache identity

Hash of:

- source body
- runtime params
- referenced assets
- kernel / OCCT version
- meshing settings

Deduplicate simultaneous same-build requests (single-flight). **Do not** remove the OCCT per-process mutex.

## Artifact contents

- triangle mesh (positions / indices / normals, per feature if needed)
- preview image (optional)
- diagnostics + bbox / camera-fit bounds
- build metadata (kernel version, mesher settings, source hash)

## Delivery

1. `open_in_studio` / project save enqueues or inline-builds artifact when cheap.
2. Embed accepts `?meshUrl=` (already wired as a search-param hook).
3. FunnelViewer accepts `meshUrl` prop (hook present; still executes source today).
4. Widget iframe prefers `embedUrl` which can later point at mesh-backed embed.

## Non-goals for the first artifact PR

- Removing code-driven embed path (keep as fallback when artifact missing)
- Touching OCCT poison / mutex recovery

## Next implementation slice

1. Server: `build_artifacts` table + object storage for mesh blobs.
2. Single-flight builder keyed by cache identity.
3. Embed: if `meshUrl` (or project artifact pointer) present, load mesh into Viewer without `executeCode`.
4. Keep source path as fallback when artifact miss / stale kernel.
