// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { RateLimitedPanel } from './RateLimitedPanel';

afterEach(cleanup);

describe('RateLimitedPanel', () => {
  it('shows the server message and an Upgrade link to upgrade_url', () => {
    render(<RateLimitedPanel authenticated onUpgrade={vi.fn()} message="You used 5 of 5 builds." upgradeUrl="https://app.kernelcad.com/pricing?src=quota" />);
    expect(screen.getByText('You used 5 of 5 builds.')).toBeTruthy();
    const link = screen.getByRole('link', { name: 'Upgrade' });
    expect(link.getAttribute('href')).toBe('https://app.kernelcad.com/pricing?src=quota');
  });

  it('keeps the generic checkout button without an upgrade_url', () => {
    render(<RateLimitedPanel authenticated onUpgrade={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Upgrade/ })).toBeTruthy();
  });
});
