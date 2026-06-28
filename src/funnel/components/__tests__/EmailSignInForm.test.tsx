// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment jsdom
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

const signInWithOtp = vi.fn().mockResolvedValue({ error: null });
vi.mock('../../lib/supabaseClient', () => ({
  getSupabase: () => ({ auth: { signInWithOtp } }),
}));
import { EmailSignInForm } from '../EmailSignInForm';

describe('EmailSignInForm', () => {
  it('sends a magic link and shows confirmation', async () => {
    render(<EmailSignInForm redirectTo="https://app.example/studio" />);
    fireEvent.change(screen.getByPlaceholderText(/email/i), {
      target: { value: 'a@b.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /magic link/i }));
    await waitFor(() =>
      expect(signInWithOtp).toHaveBeenCalledWith({
        email: 'a@b.com',
        options: { emailRedirectTo: 'https://app.example/studio' },
      }),
    );
    expect(await screen.findByText(/check your inbox/i)).toBeInTheDocument();
  });
});
