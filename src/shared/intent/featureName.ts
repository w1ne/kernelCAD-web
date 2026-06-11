// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Feature-name validation regex.
// Used by both holeValidation (authoring) and paramTable (shared/runtime) — must
// live in shared/ so paramTable can reference it without an upward dep into
// authoring.
export const FEATURE_NAME_REGEX = /^[a-zA-Z][a-zA-Z0-9_-]{0,31}$/;
