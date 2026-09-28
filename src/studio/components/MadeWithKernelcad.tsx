// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/studio/components/MadeWithKernelcad.tsx
//
// Small "Made with kernelCAD" link on public viewer surfaces (/embed/<slug>,
// /p/<slug>). Name and target come from shared/links/attribution.ts, the one
// place a fork edits. Always shown: there is no owner-side setting to hide it.

import React from 'react';
import { attributionUrl, KERNELCAD_NAME, type LinkSurface } from '../../shared/links/attribution';

export interface MadeWithKernelcadProps {
  surface: Extract<LinkSurface, 'embed' | 'share'>;
  /** Placement classes. Defaults to the bottom-left corner of the window. */
  className?: string;
}

export function MadeWithKernelcad({
  surface,
  className = 'fixed bottom-2 left-2',
}: MadeWithKernelcadProps): React.JSX.Element {
  return (
    <a
      href={attributionUrl(surface)}
      target="_blank"
      rel="noopener"
      data-testid="made-with-kernelcad"
      className={`${className} z-20 rounded bg-black/45 px-1.5 py-0.5 font-mono text-[10px] leading-4 text-white/75 no-underline hover:text-white focus:outline-none focus:ring-1 focus:ring-white/60`}
    >
      Made with {KERNELCAD_NAME}
    </a>
  );
}
