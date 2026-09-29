// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useRef } from 'react';
import { X } from 'lucide-react';
import { useFocusTrap } from '../../ui';
import { BrandMark } from './FunnelHeader';
import { SignInButton } from './SignInButton';
import { EmailPasswordForm } from './EmailPasswordForm';

export interface SignInModalProps {
  open: boolean;
  onClose: () => void;
  /** Shown above the Google button — explains *why* the user is being asked
   * to sign in right now (e.g. "Sign in to generate"). */
  title?: string;
  /** Sub-copy under the title. */
  description?: string;
  /** Override where Google redirects after auth completes (defaults to the
   * current href so the user lands back where they were). */
  redirectTo?: string;
  /** When false, the modal cannot be dismissed (no ×, no Esc, no backdrop close). Default true. */
  dismissable?: boolean;
  /** Footer line under the buttons. Default: the 5-free-generations note. */
  footer?: React.ReactNode;
}

/**
 * Floating sign-in dialog. Replaces a full-page /signin redirect when the
 * user is mid-flow (e.g. about to generate). After Google OAuth completes,
 * the redirect lands on `redirectTo`; the caller is responsible for resuming
 * the interrupted action (the landing page reads `kc:pendingPrompt` from
 * localStorage and auto-submits).
 */
export function SignInModal({
  open,
  onClose,
  title = 'Sign in to generate',
  description = '5 free generations to start — your prompt resumes automatically after sign-in.',
  redirectTo,
  dismissable = true,
  footer,
}: SignInModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Focus moves into the dialog, Tab stays inside, Esc closes (when allowed),
  // and focus returns to the opener when it closes.
  useFocusTrap(dialogRef, open, dismissable ? onClose : undefined);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="signin-modal-title"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-scrim p-4 backdrop-blur-sm"
      onClick={dismissable ? onClose : undefined}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        onClick={e => e.stopPropagation()}
        className="relative w-full max-w-sm animate-pop-in rounded-sheet border border-border bg-surface-1 p-6 text-center text-fg shadow-e3 focus:outline-none sm:p-8"
      >
        {dismissable && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="focus-ring absolute right-2 top-2 flex size-touch items-center justify-center rounded-control text-fg-3 transition-colors hover:bg-surface-2 hover:text-fg"
          >
            <X className="size-5" strokeWidth={1.75} aria-hidden="true" />
          </button>
        )}

        <BrandMark className="mb-5 justify-center" />

        <h2 id="signin-modal-title" className="font-serif text-heading text-fg">
          {title}
        </h2>
        <p className="mt-2 text-ui text-fg-2">{description}</p>

        <div className="mt-6 flex flex-col gap-2">
          <SignInButton provider="google" redirectTo={redirectTo ?? window.location.href}>
            Continue with Google
          </SignInButton>
          <SignInButton provider="github" redirectTo={redirectTo ?? window.location.href}>
            Continue with GitHub
          </SignInButton>
        </div>

        <OrDivider />

        <EmailPasswordForm redirectTo={redirectTo ?? window.location.href} />

        {footer ?? (
          <p className="mt-5 text-ui text-fg-3">
            5 free generations · upgrade after to keep generating
          </p>
        )}
      </div>
    </div>
  );
}

/** "—— or ——" between the OAuth buttons and the email form. */
export function OrDivider() {
  return (
    <div className="my-5 flex items-center gap-3" aria-hidden="true">
      <span className="h-px flex-1 bg-border" />
      <span className="text-ui text-fg-3">or</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}
