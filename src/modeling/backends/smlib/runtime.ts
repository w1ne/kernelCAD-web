// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/** The package initializes WASM at import time. Never import it eagerly. */
const warnings: string[] = [];
let loading: Promise<typeof import('@classcad/smlibwasm')> | undefined;

export function loadSmlib(): Promise<typeof import('@classcad/smlibwasm')> {
  loading ??= import('@classcad/smlibwasm').then((sm) => {
    sm.setWarningHandler((message) => { warnings.push(message); });
    return sm;
  });
  return loading;
}

/** Warnings recorded since the last call, including renamed 0.5 forms. */
export function takeSmlibWarnings(): string[] {
  return warnings.splice(0, warnings.length);
}
