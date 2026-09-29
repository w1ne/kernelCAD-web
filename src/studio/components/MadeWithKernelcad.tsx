// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/studio/components/MadeWithKernelcad.tsx
//
// Small "Made with kernelCAD" link on public viewer surfaces (/embed/<slug>,
// /p/<slug>). Name and target come from shared/links/attribution.ts, the one
// place a fork edits. Always shown: there is no owner-side setting to hide it.
// With `remixSlug`, a "Remix" link next to it opens that project in the app,
// where Remix copies it into the viewer's own projects.
//
// `EmbedAttributionBar` is the /embed/<slug> variant: a slim footer under the
// canvas (never over the model) with the attribution on the left and a Remix
// button on the right. It reads its colours from the embed's `--embed-*`
// custom properties, so it follows the embed theme.

import React from 'react';
import { GitFork } from 'lucide-react';
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

export interface EmbedAttributionBarProps {
  /** Project to offer "Remix in kernelCAD" for. No slug, no Remix button
   *  (a missing or private model has nothing to remix). */
  remixSlug?: string;
}

/** Footer height of the embed attribution bar, in px. The canvas sits above it. */
export const EMBED_ATTRIBUTION_BAR_PX = 36;

export function EmbedAttributionBar({ remixSlug }: EmbedAttributionBarProps): React.JSX.Element {
  return (
    <footer
      data-testid="embed-attribution-bar"
      className="flex shrink-0 items-center justify-between gap-2 border-t border-[var(--embed-border)] bg-[var(--embed-surface)] px-2 font-sans"
      style={{ height: EMBED_ATTRIBUTION_BAR_PX }}
    >
      <a
        href={attributionUrl('embed')}
        target="_blank"
        rel="noopener"
        data-testid="made-with-kernelcad"
        className="min-w-0 truncate rounded px-1 text-xs leading-7 text-[var(--embed-fg-2)] no-underline hover:text-[var(--embed-fg)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--embed-accent)]"
      >
        Made with <span className="font-semibold">{KERNELCAD_NAME}</span>
      </a>
      {remixSlug ? (
        <a
          href={remixUrl(remixSlug)}
          target="_blank"
          rel="noopener"
          data-testid="remix-in-kernelcad"
          aria-label={`Remix in ${KERNELCAD_NAME}`}
          className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md bg-[var(--embed-accent)] px-2.5 text-xs font-semibold text-[var(--embed-on-accent)] no-underline hover:bg-[var(--embed-accent-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--embed-fg)] focus-visible:ring-offset-1"
        >
          <GitFork size={14} strokeWidth={2} aria-hidden="true" />
          <span>
            Remix<span className="hidden min-[420px]:inline">{` in ${KERNELCAD_NAME}`}</span>
          </span>
        </a>
      ) : null}
    </footer>
  );
}
