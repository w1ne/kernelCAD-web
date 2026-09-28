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
});
