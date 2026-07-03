// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { PricingTiers } from './PricingTiers';

afterEach(cleanup);

describe('PricingTiers', () => {
  it('calls onSelect with the paid tier id when its Subscribe button is clicked', () => {
    const onSelect = vi.fn();
    render(<PricingTiers onSelect={onSelect} onFree={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /subscribe to standard/i }));
    expect(onSelect).toHaveBeenCalledWith('standard');
  });

  it('calls onFree when the free tier CTA is clicked', () => {
    const onFree = vi.fn();
    render(<PricingTiers onSelect={vi.fn()} onFree={onFree} />);
    fireEvent.click(screen.getByRole('button', { name: /get started with free/i }));
    expect(onFree).toHaveBeenCalled();
  });

  it('marks the active tier as the current plan instead of offering to subscribe', () => {
    const onSelect = vi.fn();
    render(<PricingTiers currentPlan="pro" currentTier="standard" onSelect={onSelect} onFree={vi.fn()} />);
    // The Standard card is the user's current plan.
    expect(screen.getByRole('button', { name: /current plan \(standard\)/i })).toBeDefined();
    // And clicking it does nothing (disabled).
    fireEvent.click(screen.getByRole('button', { name: /current plan \(standard\)/i }));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('highlights Standard as the most popular tier', () => {
    render(<PricingTiers onSelect={vi.fn()} onFree={vi.fn()} />);
    expect(screen.getByText(/most popular/i)).toBeDefined();
  });
});
