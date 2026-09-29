// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/** @vitest-environment happy-dom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import type { Session } from '@supabase/supabase-js';

vi.mock('../../funnel/components/SignInButton', () => ({
  SignInButton: ({ provider }: { provider?: string }) => <button type="button">{`Continue with ${provider}`}</button>,
}));
vi.mock('../../funnel/components/EmailPasswordForm', () => ({
  EmailPasswordForm: () => <form aria-label="email sign-in" />,
}));

import { AnonClaimLanding } from './-AnonClaimLanding';
import { ANON_CLAIM_ERROR_TEXT } from './-anonClaim';

afterEach(cleanup);

const session = { user: { id: 'user-1' } } as Session;

describe('AnonClaimLanding', () => {
  it('claims once after sign-in and hands the moved count to the caller', async () => {
    const claim = vi.fn(async () => ({ moved: 3, alreadyOwned: 0 }));
    const onClaimed = vi.fn();
    const { rerender } = render(
      <AnonClaimLanding token="kcc1.a.b" session={session} loading={false} claim={claim} onClaimed={onClaimed} />,
    );
    await waitFor(() => expect(onClaimed).toHaveBeenCalledWith({ moved: 3, alreadyOwned: 0 }));
    rerender(<AnonClaimLanding token="kcc1.a.b" session={session} loading={false} claim={claim} onClaimed={onClaimed} />);
    expect(claim).toHaveBeenCalledTimes(1);
    expect(claim).toHaveBeenCalledWith('kcc1.a.b');
  });

  it('asks a signed-out visitor to sign in and does not claim yet', () => {
    const claim = vi.fn();
    render(<AnonClaimLanding token="kcc1.a.b" session={null} loading={false} claim={claim} onClaimed={vi.fn()} />);
    expect(screen.getByText('Sign in and the projects from your chat move to your account.')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Continue with google' })).toBeDefined();
    expect(claim).not.toHaveBeenCalled();
  });

  it('explains a claim refused because another account owns the projects', async () => {
    const claim = vi.fn(async () => { throw new Error('{"error":"claimed_by_another_account"}'); });
    render(<AnonClaimLanding token="kcc1.a.b" session={session} loading={false} claim={claim} onClaimed={vi.fn()} />);
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe(ANON_CLAIM_ERROR_TEXT.foreign));
  });

  it('explains an expired link', async () => {
    const claim = vi.fn(async () => { throw new Error('{"error":"claim_token_expired"}'); });
    render(<AnonClaimLanding token="kcc1.a.b" session={session} loading={false} claim={claim} onClaimed={vi.fn()} />);
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe(ANON_CLAIM_ERROR_TEXT.expired));
  });

  it('rejects a link without a token', () => {
    const claim = vi.fn();
    render(<AnonClaimLanding token={undefined} session={session} loading={false} claim={claim} onClaimed={vi.fn()} />);
    expect(screen.getByText(ANON_CLAIM_ERROR_TEXT.invalid)).toBeDefined();
    expect(claim).not.toHaveBeenCalled();
  });
});
