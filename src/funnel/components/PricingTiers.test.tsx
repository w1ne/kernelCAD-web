// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { PricingTiers } from './PricingTiers';

afterEach(cleanup);

describe('PricingTiers', () => {
  it('calls onSelect with the tier and the current period when Subscribe is clicked', () => {
    const onSelect = vi.fn();
    render(<PricingTiers period="monthly" onSelect={onSelect} onFree={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /subscribe to standard/i }));
    expect(onSelect).toHaveBeenCalledWith('standard', 'monthly');
  });

  it('passes the yearly period through to onSelect', () => {
    const onSelect = vi.fn();
    render(<PricingTiers period="yearly" onSelect={onSelect} onFree={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /subscribe to team/i }));
    expect(onSelect).toHaveBeenCalledWith('pro', 'yearly');
  });

  it('shows the yearly total and "2 months free" when period is yearly', () => {
    render(<PricingTiers period="yearly" onSelect={vi.fn()} onFree={vi.fn()} />);
    expect(screen.getByText(/\$200\/year — 2 months free/i)).toBeDefined();
  });

  it('calls onFree when the free tier CTA is clicked', () => {
    const onFree = vi.fn();
    render(<PricingTiers period="monthly" onSelect={vi.fn()} onFree={onFree} />);
    fireEvent.click(screen.getByRole('button', { name: /get started with free/i }));
    expect(onFree).toHaveBeenCalled();
  });

  it('marks the active tier as the current plan instead of offering to subscribe', () => {
    const onSelect = vi.fn();
    render(<PricingTiers period="monthly" currentPlan="pro" currentTier="standard" onSelect={onSelect} onFree={vi.fn()} />);
    expect(screen.getByRole('button', { name: /current plan \(standard\)/i })).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: /current plan \(standard\)/i }));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('renders a Team tier for enterprises', () => {
    render(<PricingTiers period="monthly" onSelect={vi.fn()} onFree={vi.fn()} />);
    expect(screen.getByRole('button', { name: /subscribe to team/i })).toBeDefined();
  });

  it('highlights Standard as the most popular tier', () => {
    render(<PricingTiers period="monthly" onSelect={vi.fn()} onFree={vi.fn()} />);
    expect(screen.getByText(/most popular/i)).toBeDefined();
  });
});
