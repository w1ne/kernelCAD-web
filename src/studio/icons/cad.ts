// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { createLucideIcon } from 'lucide-react';

/**
 * Small CAD-specific icons that aren't available in the default icon set.
 * Kept Lucide-compatible so they can be used wherever a `LucideIcon` is expected.
 */
export const ChamferIcon = createLucideIcon('Chamfer', [
    ['path', { d: 'M4 4H16L20 8V20H4Z', key: 'chamfer-shape' }],
]);

