// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/** The package initializes WASM at import time. Never import it eagerly. */
export function loadSmlib(): Promise<typeof import('@classcad/smlibwasm')> {
  return import('@classcad/smlibwasm');
}
