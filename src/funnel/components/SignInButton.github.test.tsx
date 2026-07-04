// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SignInButton } from './SignInButton';

const signInWithOAuth = vi.fn();
vi.mock('../lib/supabaseClient', () => ({
  getSupabase: () => ({ auth: { signInWithOAuth } }),
}));

afterEach(() => {
  cleanup();
  signInWithOAuth.mockReset();
});

describe('SignInButton provider', () => {
  it('defaults to Google', async () => {
    signInWithOAuth.mockResolvedValue({ error: null });
    render(<SignInButton redirectTo="https://x/y">Continue with Google</SignInButton>);
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(signInWithOAuth).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'google', options: { redirectTo: 'https://x/y' } }),
    ));
  });

  it('uses GitHub when provider="github"', async () => {
    signInWithOAuth.mockResolvedValue({ error: null });
    render(<SignInButton provider="github" redirectTo="https://x/y">Continue with GitHub</SignInButton>);
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(signInWithOAuth).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'github', options: { redirectTo: 'https://x/y' } }),
    ));
  });
});
