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
    fireEvent.click(screen.getByRole('button', { name: /subscribe to standard/i }));
    expect(onSelect).toHaveBeenCalledWith('standard', 'yearly');
  });

  it('shows the yearly total and "2 months free" when period is yearly', () => {
    render(<PricingTiers period="yearly" onSelect={vi.fn()} onFree={vi.fn()} />);
    expect(screen.getByText(/\$200\/year — 2 months free/i)).toBeDefined();
  });

  it('offers no Free plan card', () => {
    render(<PricingTiers period="monthly" onSelect={vi.fn()} onFree={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /get started with free/i })).toBeNull();
    expect(screen.queryByLabelText(/free plan/i)).toBeNull();
  });

  it('marks the active tier as the current plan instead of offering to subscribe', () => {
    const onSelect = vi.fn();
    render(<PricingTiers period="monthly" currentPlan="pro" currentTier="standard" onSelect={onSelect} onFree={vi.fn()} />);
    expect(screen.getByRole('button', { name: /current plan \(standard\)/i })).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: /current plan \(standard\)/i }));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('renders an Enterprise tier as a contact-sales link, never a checkout', () => {
    const onSelect = vi.fn();
    render(<PricingTiers period="monthly" onSelect={onSelect} onFree={vi.fn()} />);
    // No self-serve Subscribe button for Enterprise.
    expect(screen.queryByRole('button', { name: /subscribe to enterprise/i })).toBeNull();
    // Instead, a mailto "Contact sales" link.
    const contact = screen.getByRole('link', { name: /contact sales about enterprise/i });
    expect(contact.getAttribute('href')).toMatch(/^mailto:/);
    fireEvent.click(contact);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('does not mark Enterprise as the current plan for free users', () => {
    render(<PricingTiers period="monthly" currentPlan="free" onSelect={vi.fn()} onFree={vi.fn()} />);
    // Enterprise CTA stays a contact link (not a disabled "Current plan").
    expect(screen.getByRole('link', { name: /contact sales about enterprise/i })).toBeDefined();
  });

  it('highlights Standard as the most popular tier', () => {
    render(<PricingTiers period="monthly" onSelect={vi.fn()} onFree={vi.fn()} />);
    expect(screen.getByText(/most popular/i)).toBeDefined();
  });
});
