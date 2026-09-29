// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

/** Join class names, dropping falsy parts. */
export function cx(...parts: ReadonlyArray<string | false | null | undefined>): string {
    return parts.filter(Boolean).join(' ');
}
