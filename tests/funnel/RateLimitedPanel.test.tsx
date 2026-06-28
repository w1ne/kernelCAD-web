// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { RateLimitedPanel } from '../../src/funnel/components/RateLimitedPanel';

afterEach(() => cleanup());

describe('RateLimitedPanel', () => {
  it('renders authenticated copy with the Upgrade CTA', () => {
    const onUpgrade = vi.fn();
    render(<RateLimitedPanel authenticated onUpgrade={onUpgrade} />);

    expect(screen.getByText(/used your free generations/i)).toBeDefined();
    const btn = screen.getByRole('button', { name: /Upgrade/i });
    fireEvent.click(btn);
    expect(onUpgrade).toHaveBeenCalledTimes(1);
  });

  it('renders Sign-in copy when unauthenticated', () => {
    const onUpgrade = vi.fn();
    render(<RateLimitedPanel authenticated={false} onUpgrade={onUpgrade} />);

    const btn = screen.getByRole('button', { name: /Sign in to upgrade/i });
    fireEvent.click(btn);
    expect(onUpgrade).toHaveBeenCalledTimes(1);
  });

  it('disables the button when busy', () => {
    render(<RateLimitedPanel authenticated onUpgrade={() => {}} busy />);
    const btn = screen.getByRole('button', { name: /Loading/i }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });
});
