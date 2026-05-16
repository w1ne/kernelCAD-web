// Canonical backend target enum. 'faceted-mesh' is reserved for a future fallback
// path (Manifold / mesh-only); v0.1 ships only 'export-occt'.
//
// Lives in shared/types so both kernel/backends/ and shared/diagnostics/ can
// depend on it without violating shared-stays-leaf.
export const BACKEND_TARGETS = ['export-occt', 'faceted-mesh'] as const;
export type BackendTarget = (typeof BACKEND_TARGETS)[number];
