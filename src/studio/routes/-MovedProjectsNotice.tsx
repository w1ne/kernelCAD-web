// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { ReactNode } from 'react';
import { movedProjectsText } from './-anonClaim';

export function MovedProjectsNotice({ moved }: { moved: number | undefined }): ReactNode {
  if (moved === undefined) return null;
  return (
    <p role="status" className="mt-8 rounded-lg border border-emerald-600/40 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
      {movedProjectsText(moved)}
    </p>
  );
}
