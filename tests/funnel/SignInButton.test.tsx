// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { SignInButton } from '../../src/funnel/components/SignInButton';

const signInWithOAuth = vi.fn().mockResolvedValue({ error: null });

vi.mock('../../src/funnel/lib/supabaseClient', () => ({
  getSupabase: () => ({
    auth: { signInWithOAuth },
  }),
}));

describe('SignInButton', () => {
  beforeEach(() => {
    signInWithOAuth.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders default label', () => {
    render(<SignInButton />);
    expect(screen.getByRole('button', { name: /Continue with Google/i })).toBeDefined();
  });

  it('renders custom children', () => {
    render(<SignInButton>Save with Google</SignInButton>);
    expect(screen.getByRole('button', { name: /Save with Google/i })).toBeDefined();
  });

  it('calls signInWithOAuth with provider=google + redirectTo from window.location', async () => {
    Object.defineProperty(window, 'location', {
      value: { href: 'https://kernelcad.com/g/abc123', origin: 'https://kernelcad.com' },
      writable: true,
    });
    render(<SignInButton />);
    fireEvent.click(screen.getByRole('button'));
    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: 'https://kernelcad.com/g/abc123' },
    });
  });

  it('respects explicit redirectTo prop', async () => {
    render(<SignInButton redirectTo="https://kernelcad.com/p/foo" />);
    fireEvent.click(screen.getByRole('button'));
    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: 'https://kernelcad.com/p/foo' },
    });
  });
});
