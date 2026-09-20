// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useCallback, useMemo } from 'react';
import type { CodeContextType } from './CodeContext';
import type { GeometryContextType } from './GeometryContext';
import { isEphemeralProjectId, useProject } from './ProjectContext';
import { sourceParamEdits } from './sourceParamEdits';

export function usePersistentParams(code: CodeContextType, geometry: GeometryContextType): GeometryContextType {
  const { activeProjectId, saveActiveProject } = useProject();
  const updateParam = useCallback<GeometryContextType['updateParam']>(async edits => {
    const linked = new URLSearchParams(window.location.search);
    if (!code.hasControlledCode && !geometry.sessionToken && !isEphemeralProjectId(activeProjectId) && !linked.has('script') && !linked.has('gallery')) {
      const next = sourceParamEdits(code.code, edits);
      if (next !== null) {
        saveActiveProject({ code: next });
        code.mutateCode(() => next, 'updateParams');
        return;
      }
    }
    await geometry.updateParam(edits);
  }, [code, geometry, activeProjectId, saveActiveProject]);
  return useMemo(() => ({ ...geometry, updateParam }), [geometry, updateParam]);
}
