// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Canonical backend target enum. 'faceted-mesh' is reserved for a future fallback
// path (Manifold / mesh-only); v0.1 ships only 'export-occt'. 'export-smlib' is
// reserved for the SMLib kernel (see KernelId below); nothing lowers to it yet.
//
// Lives in shared/types so both kernel/backends/ and shared/diagnostics/ can
// depend on it without violating shared-stays-leaf.
export const BACKEND_TARGETS = ['export-occt', 'faceted-mesh', 'export-smlib'] as const;
export type BackendTarget = (typeof BACKEND_TARGETS)[number];

/**
 * Solid-modeling kernel a model is built on. 'occt' (OpenCascade via
 * replicad) is the default and the only kernel wired today; 'smlib'
 * (NVIDIA's open-sourced SMLib) is reserved so models, the CLI and MCP tools
 * can name it ahead of the backend landing. Selecting it yields a typed
 * `recompute.kernel.unavailable` error, never a silent fallback to OCCT.
 */
export const KERNEL_IDS = ['occt', 'smlib'] as const;
export type KernelId = (typeof KERNEL_IDS)[number];
export const DEFAULT_KERNEL: KernelId = 'occt';

/** Backend target each kernel lowers to. */
export const KERNEL_BACKEND_TARGET: Readonly<Record<KernelId, BackendTarget>> = {
  occt: 'export-occt',
  smlib: 'export-smlib',
};

export function isKernelId(value: unknown): value is KernelId {
  return typeof value === 'string' && (KERNEL_IDS as readonly string[]).includes(value);
}
