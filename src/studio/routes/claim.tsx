// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useCallback } from 'react';
import { useOptionalSession } from '../../funnel/hooks/useSession';
import type { AnonClaimResult } from '../../funnel/lib/apiClient';
import { AnonClaimLanding } from './-AnonClaimLanding';

// Sign-in link from an anonymous MCP tool result ("Sign in at <link> to keep
// it"). The token covers every project that anonymous session made.
export const Route = createFileRoute('/claim')({
  component: ClaimPage,
  validateSearch: (s: Record<string, unknown>): { t?: string } =>
    typeof s.t === 'string' && s.t.length > 0 ? { t: s.t } : {},
});

function ClaimPage() {
  const { t } = Route.useSearch();
  const { session, loading } = useOptionalSession();
  const navigate = useNavigate();
  const onClaimed = useCallback((result: AnonClaimResult) => {
    void navigate({ to: '/me', search: { moved: result.moved }, replace: true });
  }, [navigate]);
  return <AnonClaimLanding token={t} session={session} loading={loading} onClaimed={onClaimed} />;
}
