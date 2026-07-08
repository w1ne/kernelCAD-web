// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/naming/uniquenessValidator.ts
//
// Compatibility re-export for existing kernel/modeling callers. The shared
// topology-ref name contract lives in src/shared/naming/topoRefName.ts so
// shared manifests can validate connector names without importing kernel.

export {
  assertTopoRefSafeName,
  RESERVED_TOPO_REF_CHARS,
  TOPO_REF_NAME_REGEX,
} from '../../shared/naming/topoRefName';
