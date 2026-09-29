// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { JSX, ReactNode } from 'react';
import { cx } from '../../ui';

/** The kernelCAD "K" mark and wordmark. */
export function BrandMark({ className }: { readonly className?: string }): JSX.Element {
  return (
    <span className={cx('inline-flex items-center gap-2 font-serif text-title font-medium text-fg', className)}>
      <svg className="size-5" viewBox="0 0 84 84" fill="none" aria-hidden="true">
        <path
          d="M 14,12 L 26,12 L 26,34 Q 26,36 27.5,34.5 L 46,12 L 60,12 L 36,40 Q 35,42 36,44 L 60,72 L 46,72 L 27.5,49.5 Q 26,48 26,50 L 26,72 L 14,72 Z"
          fill="currentColor"
        />
      </svg>
      <span>
        kernel<span className="text-accent">CAD</span>
      </span>
    </span>
  );
}

export type FunnelPage = 'generate' | 'connect' | 'pricing' | 'signin' | 'other';

const LINKS: ReadonlyArray<{ id: FunnelPage | 'gallery' | 'me'; label: string; href: string; wide?: boolean }> = [
  { id: 'gallery', label: 'Gallery', href: '/gallery', wide: true },
  { id: 'connect', label: 'Connect', href: '/connect' },
  { id: 'pricing', label: 'Pricing', href: '/pricing' },
  { id: 'me', label: 'Your projects', href: '/me' },
];

export interface FunnelHeaderProps {
  /** The page this header is on; its link is marked current. */
  readonly current: FunnelPage;
  /** Extra content on the right (e.g. a "Log in" link). */
  readonly end?: ReactNode;
}

/** Top bar of the public funnel pages: brand home link and the main destinations. */
export function FunnelHeader({ current, end }: FunnelHeaderProps): JSX.Element {
  return (
    <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
      <a href="/" aria-label="kernelCAD home" className="focus-ring rounded-control no-underline">
        <BrandMark />
      </a>
      <nav aria-label="Main" className="flex items-center gap-0.5 sm:gap-1">
        {LINKS.map((l) => (
          <a
            key={l.id}
            href={l.href}
            aria-current={l.id === current ? 'page' : undefined}
            className={cx(
              'focus-ring inline-flex min-h-touch items-center rounded-control px-2 text-ui font-medium no-underline transition-colors duration-80 sm:min-h-control-md sm:px-2.5',
              l.id === current ? 'text-fg' : 'text-fg-2 hover:text-fg',
              l.wide && 'hidden sm:inline-flex',
            )}
          >
            {l.label}
          </a>
        ))}
        {end}
      </nav>
    </header>
  );
}
