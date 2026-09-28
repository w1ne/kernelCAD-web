// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MadeWithKernelcad } from './MadeWithKernelcad';

afterEach(cleanup);

describe('MadeWithKernelcad', () => {
  it('links back to kernelcad.com tagged with the embed surface', () => {
    render(<MadeWithKernelcad surface="embed" />);
    const link = screen.getByTestId('made-with-kernelcad');
    expect(link.textContent).toBe('Made with kernelCAD');
    expect(link.getAttribute('href')).toBe('https://kernelcad.com/?ref=embed&utm_source=kernelcad&utm_medium=embed');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener');
  });

  it('tags the share page separately and accepts placement classes', () => {
    render(<MadeWithKernelcad surface="share" className="absolute bottom-2 left-2" />);
    const link = screen.getByTestId('made-with-kernelcad');
    expect(new URL(link.getAttribute('href')!).searchParams.get('ref')).toBe('share');
    expect(link.className).toContain('absolute bottom-2 left-2');
  });

  it('adds a Remix in kernelCAD link to the app project, tagged ref=embed-remix', () => {
    render(<MadeWithKernelcad surface="embed" className="fixed bottom-2 right-2" remixSlug="abc 1" />);
    const remix = screen.getByTestId('remix-in-kernelcad');
    expect(remix.textContent).toBe('Remix in kernelCAD');
    const url = new URL(remix.getAttribute('href')!);
    expect(url.origin + url.pathname).toBe('https://app.kernelcad.com/p/abc%201');
    expect(url.searchParams.get('remix')).toBe('1');
    expect(url.searchParams.get('ref')).toBe('embed-remix');
    expect(remix.getAttribute('target')).toBe('_blank');
    // Placement moves to the wrapper; the Made-with link is unchanged.
    const made = screen.getByTestId('made-with-kernelcad');
    expect(made.getAttribute('href')).toBe('https://kernelcad.com/?ref=embed&utm_source=kernelcad&utm_medium=embed');
    expect(made.parentElement!.className).toContain('fixed bottom-2 right-2');
  });

  it('renders no Remix link without a slug', () => {
    render(<MadeWithKernelcad surface="share" />);
    expect(screen.queryByTestId('remix-in-kernelcad')).toBeNull();
  });
});
