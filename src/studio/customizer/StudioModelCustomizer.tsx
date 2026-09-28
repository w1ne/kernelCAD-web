// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/**
 * StudioModelCustomizer — `ModelCustomizer` wired to the viewer it sits in.
 * Mount it inside a `WorkbenchProvider` (the /p/<slug> Studio viewer or the
 * /embed/<slug> FunnelViewer).
 *
 * Re-run: the geometry context's own `updateParam` — the same stateless
 * param-override mesh path the viewer already uses when no kernel session is
 * open (server `/__kernelcad/mesh` on the hosted app, the dev middleware on
 * localhost). It is the GeometryContext updater on purpose, not the
 * Workbench one: that wrapper saves param edits into the local project.
 *
 * Export: the configured source (values baked into the `param()` defaults)
 * through `exportViaServer` — the same `/__kernelcad/export` path as the
 * Studio Export tab. Nothing is saved.
 */
import { useCallback, useMemo, useRef, useState, type JSX } from 'react';
import { useCode } from '../context/CodeContext';
import { useGeometry } from '../context/GeometryContext';
import { exportViaServer } from '../exportViaServer';
import type { SerializedParamEntry } from '../../shared/runtime/paramTable';
import {
  bakeParamValues,
  changedValues,
  customizerParamsFrom,
  type CustomizerFormat,
  type CustomizerParam,
  type CustomizerParamHint,
  type CustomizerValues,
} from './customizerParams';
import { ModelCustomizer } from './ModelCustomizer';

export interface StudioModelCustomizerProps {
  slug: string;
  /** Unit/step hints saved with the project (`projects.parameters`). */
  hints?: readonly CustomizerParamHint[];
  defaultCollapsed?: boolean;
  className?: string;
}

/**
 * The declarations of the CURRENT source, taken from its first build. Later
 * builds carry the customizer's own values (a baked text value even moves
 * its declared default), so they are not read again until the code changes.
 * A build result that was already on screen when the code changed belongs to
 * the old code and is skipped.
 */
function useDeclaredParams(code: string, scriptParams: SerializedParamEntry[]) {
  const [seen, setSeen] = useState({ code, staleParams: null as SerializedParamEntry[] | null });
  const [declared, setDeclared] = useState<{ code: string; entries: SerializedParamEntry[] } | null>(null);
  if (seen.code !== code) setSeen({ code, staleParams: scriptParams });
  const fresh = seen.code === code && scriptParams !== seen.staleParams;
  if (fresh && scriptParams.length > 0 && declared?.code !== code) {
    setDeclared({ code, entries: scriptParams });
  }
  return declared?.code === code ? declared.entries : null;
}

/**
 * Numbers and booleans are always sent (the override map accumulates, so a
 * value back at its default must be sent to undo an earlier edit). A text or
 * choice value is written into the source, so it is sent only once it has
 * left its default — an untouched model keeps the stored project body.
 */
function useParamExecutor(
  params: readonly CustomizerParam[],
  updateParam: ReturnType<typeof useGeometry>['updateParam'],
) {
  const sentText = useRef(new Set<string>());
  return useCallback((values: CustomizerValues) => {
    const edits = params.flatMap((param) => {
      const value = values[param.name];
      if (value === undefined) return [];
      if (typeof value === 'string') {
        if (value !== param.defaultValue) sentText.current.add(param.name);
        else if (!sentText.current.has(param.name)) return [];
      }
      return [{ name: param.name, value }];
    });
    return updateParam(edits);
  }, [params, updateParam]);
}

export function StudioModelCustomizer(props: StudioModelCustomizerProps): JSX.Element | null {
  const { code } = useCode();
  const { scriptParams, isComputing, error, updateParam } = useGeometry();
  const entries = useDeclaredParams(code, scriptParams);
  const params = useMemo(
    () => (entries ? customizerParamsFrom(entries, props.hints) : []),
    [entries, props.hints],
  );

  const execute = useParamExecutor(params, updateParam);
  // Only changed values are baked: an all-default export is the saved source.
  const exportModel = useCallback(async (format: CustomizerFormat, values: CustomizerValues) => {
    const { blob } = await exportViaServer(format, bakeParamValues(code, changedValues(params, values)));
    return blob;
  }, [code, params]);

  if (params.length === 0) return null;
  return (
    <ModelCustomizer
      // New source → new declarations → fresh values from defaults + URL.
      key={code}
      slug={props.slug}
      params={params}
      busy={isComputing}
      error={error}
      execute={execute}
      exportModel={exportModel}
      defaultCollapsed={props.defaultCollapsed}
      className={props.className}
    />
  );
}
