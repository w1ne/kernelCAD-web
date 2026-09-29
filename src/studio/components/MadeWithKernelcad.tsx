// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/studio/components/MadeWithKernelcad.tsx
//
// Small "Made with kernelCAD" link on public viewer surfaces (/embed/<slug>,
// /p/<slug>). Name and target come from shared/links/attribution.ts, the one
// place a fork edits. Always shown: there is no owner-side setting to hide it.
// With `remixSlug`, a "Remix" link next to it opens that project in the app,
// where Remix copies it into the viewer's own projects.

import React from 'react';
import {
  attributionUrl,
  KERNELCAD_NAME,
  remixUrl,
  type LinkSurface,
} from '../../shared/links/attribution';

export interface MadeWithKernelcadProps {
  surface: Extract<LinkSurface, 'embed' | 'share'>;
  /** Placement classes. Defaults to the bottom-left corner of the window. */
  className?: string;
  /** Project slug to offer a "Remix in kernelCAD" link for (embeds only). */
  remixSlug?: string;
}

const LINK_CLASS =
  'rounded bg-black/45 px-1.5 py-0.5 font-mono text-[10px] leading-4 text-white/75 no-underline hover:text-white focus:outline-none focus:ring-1 focus:ring-white/60';

export function MadeWithKernelcad({
  surface,
  className = 'fixed bottom-2 left-2',
  remixSlug,
}: MadeWithKernelcadProps): React.JSX.Element {
  const madeWith = (placement: string) => (
    <a
      href={attributionUrl(surface)}
      target="_blank"
      rel="noopener"
      data-testid="made-with-kernelcad"
      className={`${placement} ${LINK_CLASS}`}
    >
      Made with {KERNELCAD_NAME}
    </a>
  );
  if (!remixSlug) return madeWith(`${className} z-20`);
  return (
    <span className={`${className} z-20 flex items-center gap-1`}>
      {madeWith('')}
      <a
        href={remixUrl(remixSlug)}
        target="_blank"
        rel="noopener"
        data-testid="remix-in-kernelcad"
        className={LINK_CLASS}
      >
        Remix in {KERNELCAD_NAME}
      </a>
    </span>
  );
}
