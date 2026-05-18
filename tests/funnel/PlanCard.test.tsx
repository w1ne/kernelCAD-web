// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PlanCard } from '../../src/funnel/components/PlanCard';

afterEach(() => cleanup());

describe('PlanCard', () => {
  it('renders the free-plan variant with generation count and Upgrade CTA', () => {
    const onUpgrade = vi.fn();
    render(
      <PlanCard
        plan="free"
        generationsRemaining={3}
        currentPeriodEnd={null}
        onUpgrade={onUpgrade}
        onManage={() => {}}
      />,
    );

    expect(screen.getByText(/Free plan/i)).toBeDefined();
    expect(screen.getByText(/3 generations remaining/i)).toBeDefined();
    const btn = screen.getByRole('button', { name: /Upgrade to Pro/i });
    fireEvent.click(btn);
    expect(onUpgrade).toHaveBeenCalledTimes(1);
  });

  it('uses singular "generation" when only one remains', () => {
    render(
      <PlanCard
        plan="free"
        generationsRemaining={1}
        currentPeriodEnd={null}
        onUpgrade={() => {}}
        onManage={() => {}}
      />,
    );
    expect(screen.getByText(/1 generation remaining/i)).toBeDefined();
  });

  it('renders the pro-plan variant with renewal date and Manage CTA', () => {
    const onManage = vi.fn();
    render(
      <PlanCard
        plan="pro"
        generationsRemaining={9999}
        currentPeriodEnd="2026-06-15T00:00:00.000Z"
        onUpgrade={() => {}}
        onManage={onManage}
      />,
    );

    expect(screen.getByText(/Pro plan/i)).toBeDefined();
    expect(screen.getByText(/renews/i)).toBeDefined();
    const btn = screen.getByRole('button', { name: /Manage subscription/i });
    fireEvent.click(btn);
    expect(onManage).toHaveBeenCalledTimes(1);
  });

  it('renders pro variant without a date when currentPeriodEnd is null', () => {
    render(
      <PlanCard
        plan="pro"
        generationsRemaining={9999}
        currentPeriodEnd={null}
        onUpgrade={() => {}}
        onManage={() => {}}
      />,
    );
    expect(screen.getByText(/active subscription/i)).toBeDefined();
  });

  it('disables buttons when busy', () => {
    render(
      <PlanCard
        plan="free"
        generationsRemaining={2}
        currentPeriodEnd={null}
        onUpgrade={() => {}}
        onManage={() => {}}
        busy
      />,
    );
    const btn = screen.getByRole('button', { name: /Loading/i }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });
});
