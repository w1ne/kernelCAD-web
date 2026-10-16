// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Kernel registry: the one place that maps a KernelId to the FeatureLowerer
// that compiles the intent IR (FeatureRecord[]) for that kernel. Callers
// (buildModel, MCP build tools) ask `createLowerer(kernel, session)` instead
// of constructing an OCCT lowerer directly, so a second kernel (SMLib) can be
// added behind this seam without touching them.
//
// OCCT remains the default. SMLib is an optional guarded backend: rejected
// candidates retain the OCCT reference and emit an explicit fallback diagnostic.
import type { FeatureLowerer, ShapeBackend } from '../../kernel/backends/backend';
import type { CompilerDiagnostic } from '../../shared/diagnostics/diagnostic';
import { withNextAction } from '../../shared/diagnostics/diagnostic';
import type { SurfaceId, SurfaceRecord } from '../../shared/intent/surfaceRecord';
import {
  DEFAULT_KERNEL,
  KERNEL_BACKEND_TARGET,
  KERNEL_IDS,
  isKernelId,
  type KernelId,
} from '../../shared/types/backendTarget';
import { createOcctLowerer } from './occt/occtLowerer';
import { createSmlibLowerer } from './smlib/smlibLowerer';

/** Session state a lowerer is pre-wired with (same shape createOcctLowerer takes). */
export interface LowererSession {
  importedGeometry: Map<string, ShapeBackend>;
  scriptDir?: string;
  getSurfaceRecord?: (id: SurfaceId) => SurfaceRecord | undefined;
}

export type LowererFactory = (session?: LowererSession) => FeatureLowerer;

const FACTORIES: Partial<Record<KernelId, LowererFactory>> = {
  occt: session => createOcctLowerer(session),
  smlib: session => createSmlibLowerer(session),
};

/** Kernels that can actually build in this build (subset of KERNEL_IDS). */
export function availableKernels(): KernelId[] {
  return KERNEL_IDS.filter(k => FACTORIES[k] !== undefined);
}

export function isKernelAvailable(kernel: KernelId): boolean {
  return FACTORIES[kernel] !== undefined;
}

export function kernelUnavailableDiagnostic(requested: unknown): CompilerDiagnostic {
  const known = isKernelId(requested);
  const name = typeof requested === 'string' ? requested : String(requested);
  return withNextAction({
    target: known ? KERNEL_BACKEND_TARGET[requested] : KERNEL_BACKEND_TARGET[DEFAULT_KERNEL],
    code: 'recompute.kernel.unavailable',
    severity: 'error',
    message: known
      ? `Kernel '${name}' is not available in this build (available: ${availableKernels().join(', ')}).`
      : `Unknown kernel '${name}' (known: ${KERNEL_IDS.join(', ')}; available: ${availableKernels().join(', ')}).`,
    hint: "Omit `kernel` or pass kernel: 'occt'.",
  });
}

export class KernelUnavailableError extends Error {
  readonly code = 'recompute.kernel.unavailable' as const;
  readonly diagnostic: CompilerDiagnostic;
  readonly requested: unknown;
  constructor(requested: unknown) {
    const diagnostic = kernelUnavailableDiagnostic(requested);
    super(diagnostic.message);
    this.name = 'KernelUnavailableError';
    this.requested = requested;
    this.diagnostic = diagnostic;
  }
}

/**
 * Validate a requested kernel. `undefined` resolves to DEFAULT_KERNEL;
 * an unknown or unavailable kernel throws KernelUnavailableError.
 */
export function resolveKernel(requested?: unknown): KernelId {
  if (requested === undefined) return DEFAULT_KERNEL;
  if (!isKernelId(requested) || !isKernelAvailable(requested)) {
    throw new KernelUnavailableError(requested);
  }
  return requested;
}

/** Build the FeatureLowerer for `kernel` (default 'occt'), pre-wired with `session`. */
export function createLowerer(kernel?: unknown, session?: LowererSession): FeatureLowerer {
  const id = resolveKernel(kernel);
  // resolveKernel guarantees a factory exists.
  return FACTORIES[id]!(session);
}

/** Test seam: register (or with `undefined`, remove) a kernel factory. Returns a restore fn. */
export function __setKernelFactoryForTest(kernel: KernelId, factory: LowererFactory | undefined): () => void {
  const prev = FACTORIES[kernel];
  if (factory) FACTORIES[kernel] = factory;
  else delete FACTORIES[kernel];
  return () => {
    if (prev) FACTORIES[kernel] = prev;
    else delete FACTORIES[kernel];
  };
}

export interface KernelCapabilities {
  /** Bump when the shape of this document changes. */
  schema: 1;
  defaultKernel: KernelId;
  kernels: Record<KernelId, { available: boolean; target: string; features: string[] }>;
}

/**
 * Per-kernel feature-support list, derived from the live lowerer dispatch
 * tables (for OCCT: `OcctLowerer.supports`, i.e. the `LOWERERS` keys).
 * `npm run kernel:capabilities` writes it to
 * src/modeling/backends/kernelCapabilities.generated.json; a unit test fails
 * when that file drifts from this function.
 */
export function buildKernelCapabilities(): KernelCapabilities {
  const kernels = {} as KernelCapabilities['kernels'];
  for (const id of KERNEL_IDS) {
    const factory = FACTORIES[id];
    kernels[id] = {
      available: factory !== undefined,
      target: KERNEL_BACKEND_TARGET[id],
      features: factory ? [...factory().supports].sort() : [],
    };
  }
  return { schema: 1, defaultKernel: DEFAULT_KERNEL, kernels };
}
