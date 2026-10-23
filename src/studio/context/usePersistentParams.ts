// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useCallback, useMemo } from 'react';
import type { CodeContextType } from './CodeContext';
import type { GeometryContextType } from './GeometryContext';
import { isEphemeralProjectId, useProject } from './ProjectContext';
import { sourceParamEdits } from './sourceParamEdits';
import { browserKernelEnabled } from '../browserKernel/flag';

export function usePersistentParams(code: CodeContextType, geometry: GeometryContextType): GeometryContextType {
  const { activeProjectId, saveActiveProject } = useProject();
  const updateParam = useCallback<GeometryContextType['updateParam']>(async (edits, options) => {
    const linked = new URLSearchParams(window.location.search);
    if (!code.hasControlledCode && !geometry.sessionToken && !isEphemeralProjectId(activeProjectId) && !linked.has('script') && !linked.has('gallery')) {
      const next = sourceParamEdits(code.code, edits);
      if (next !== null) {
        saveActiveProject({ code: next });
        code.mutateCode(() => next, 'updateParams');
        return;
      }
    }
    // `options.preview` marks a drag tick. Only the browser kernel acts on
    // it (coarse tessellation until release); the server path is unchanged.
    await geometry.updateParam(edits, browserKernelEnabled() ? options : undefined);
  }, [code, geometry, activeProjectId, saveActiveProject]);
  return useMemo(() => ({ ...geometry, updateParam }), [geometry, updateParam]);
}
