import { useEffect, useRef } from 'react';
import { SignInButton } from './SignInButton';

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
}: SignInModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Move focus into the dialog when it opens.
  useEffect(() => {
    if (!open) return;
    dialogRef.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="signin-modal-title"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        onClick={e => e.stopPropagation()}
        className="relative max-w-sm w-full rounded-xl border border-rule bg-vellum p-8 text-center shadow-xl focus:outline-none"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 text-ink-faint hover:text-ink transition-colors text-xl leading-none"
        >
          ×
        </button>

        <div className="flex items-center justify-center gap-2 mb-5">
          <svg className="w-5 h-5 text-ink" viewBox="0 0 84 84" fill="none" aria-label="kernelCAD">
            <path d="M 14,12 L 26,12 L 26,34 Q 26,36 27.5,34.5 L 46,12 L 60,12 L 36,40 Q 35,42 36,44 L 60,72 L 46,72 L 27.5,49.5 Q 26,48 26,50 L 26,72 L 14,72 Z" fill="currentColor"/>
          </svg>
          <span className="font-serif text-lg font-medium">
            kernel<span className="text-blueprint">CAD</span>
          </span>
        </div>

        <h2 id="signin-modal-title" className="font-serif text-2xl font-medium text-ink">
          {title}
        </h2>
        <p className="text-ink-soft text-sm mt-2 leading-relaxed">{description}</p>

        <div className="mt-6 flex justify-center">
          <SignInButton redirectTo={redirectTo ?? window.location.href}>
            Continue with Google
          </SignInButton>
        </div>

        <p className="mt-5 text-xs text-ink-faint font-mono tracking-wide">
          5 free generations · upgrade after to keep generating
        </p>
      </div>
    </div>
  );
}
