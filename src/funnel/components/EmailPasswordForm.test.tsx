// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { EmailPasswordForm } from './EmailPasswordForm';

const signInWithPassword = vi.fn();
const signUp = vi.fn();
vi.mock('../lib/supabaseClient', () => ({
  getSupabase: () => ({ auth: { signInWithPassword, signUp } }),
}));

afterEach(() => {
  cleanup();
  signInWithPassword.mockReset();
  signUp.mockReset();
});

describe('EmailPasswordForm', () => {
  it('renders email and password inputs and a submit button', () => {
    render(<EmailPasswordForm redirectTo="https://x/y" onAuthenticated={vi.fn()} />);
    expect(screen.getByLabelText(/email/i)).toBeTruthy();
    expect(screen.getByLabelText(/password/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeTruthy();
  });

  it('signs in with the entered credentials and calls onAuthenticated on success', async () => {
    signInWithPassword.mockResolvedValue({ data: { session: { access_token: 't' } }, error: null });
    const onAuthenticated = vi.fn();
    render(<EmailPasswordForm redirectTo="https://x/y" onAuthenticated={onAuthenticated} />);

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'demo@kernelcad.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'pw123!' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(signInWithPassword).toHaveBeenCalledWith({
      email: 'demo@kernelcad.com',
      password: 'pw123!',
    }));
    await waitFor(() => expect(onAuthenticated).toHaveBeenCalledTimes(1));
  });

  it('shows the error message when sign-in fails and does not navigate', async () => {
    signInWithPassword.mockResolvedValue({ data: { session: null }, error: { message: 'Invalid login credentials' } });
    const onAuthenticated = vi.fn();
    render(<EmailPasswordForm redirectTo="https://x/y" onAuthenticated={onAuthenticated} />);

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'a@b.c' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/invalid login credentials/i));
    expect(onAuthenticated).not.toHaveBeenCalled();
  });

  it('creates an account via signUp when toggled to register mode', async () => {
    signUp.mockResolvedValue({ data: { session: null, user: { id: 'u' } }, error: null });
    render(<EmailPasswordForm redirectTo="https://x/y" onAuthenticated={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /create an account/i }));
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'new@user.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'pw123!' } });
    fireEvent.click(screen.getByRole('button', { name: /^create account$/i }));

    await waitFor(() => expect(signUp).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'new@user.com', password: 'pw123!' }),
    ));
    expect(signInWithPassword).not.toHaveBeenCalled();
  });
});
