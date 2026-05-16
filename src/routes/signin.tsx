import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { SignInButton } from '../funnel/components/SignInButton';
import { useSession } from '../funnel/hooks/useSession';

export const Route = createFileRoute('/signin')({
  component: SignInPage,
  validateSearch: (s: Record<string, unknown>) => ({
    next: typeof s.next === 'string' ? s.next : '/',
  }),
});

function SignInPage() {
  const { next } = Route.useSearch();
  const { session, loading } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && session) {
      navigate({ to: next as '/' });
    }
  }, [loading, session, next, navigate]);

  return (
    <main className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-8">
      <div className="max-w-sm w-full">
        <h1 className="text-2xl font-bold text-center">Sign in to kernelCAD</h1>
        <p className="text-neutral-400 text-sm text-center mt-2">
          Save the model you generated.
        </p>
        <div className="mt-6 flex justify-center">
          <SignInButton redirectTo={`${window.location.origin}${next}`} />
        </div>
      </div>
    </main>
  );
}
