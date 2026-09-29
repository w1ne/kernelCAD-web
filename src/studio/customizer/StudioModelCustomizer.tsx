// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/**
 * StudioModelCustomizer — `ModelCustomizer` wired to the viewer it sits in.
 * Mount it inside a `WorkbenchProvider` (the /p/<slug> Studio viewer or the
 * /embed/<slug> FunnelViewer).
 *
 * Re-run: the geometry context's own `updateParam` — the same stateless
 * mesh path the viewer already uses when no kernel session is open (server
 * `/__kernelcad/mesh` on the hosted app, the dev middleware on localhost),
 * with the values baked into the source. It is the GeometryContext updater
 * on purpose, not the Workbench one: that wrapper saves param edits into the
 * local project.
 *
 * Export: the configured source (values baked into the `param()` defaults)
 * through `exportViaServer` — the same `/__kernelcad/export` path as the
 * Studio Export tab. Nothing is saved.
 */
import { useCallback, useMemo, useRef, useState, type JSX } from 'react';
import { useCode } from '../context/CodeContext';
import { useGeometry } from '../context/GeometryContext';
import { exportViaServer, type ExportViaServerOptions } from '../exportViaServer';
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
import { ModelCustomizer, type CustomizerLayoutMode } from './ModelCustomizer';

export interface StudioModelCustomizerProps {
  slug: string;
  /** Unit/step hints saved with the project (`projects.parameters`). */
  hints?: readonly CustomizerParamHint[];
  /** `overlay` (default): a floating card over the 3D view. `panel`: fills
   *  its container in the host's theme, for a side panel or a sheet. */
  layout?: CustomizerLayoutMode;
  /** Overlay only. Default: collapsed on a phone-width screen. */
  defaultCollapsed?: boolean;
  className?: string;
}

/** STL for a single printable body, STEP for an assembly of several. */
export function defaultDownloadFormat(bodyCount: number): CustomizerFormat {
  return bodyCount > 1 ? 'step' : 'stl';
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
 * Every value is baked into the source (`bakeIntoSource`), so the view is the
 * same script run as the export. A value is sent once it leaves its default,
 * and from then on (the edit map accumulates, so a value back at its default
 * must be sent to undo the earlier edit). An untouched param is never written.
 */
function useParamExecutor(
  params: readonly CustomizerParam[],
  updateParam: ReturnType<typeof useGeometry>['updateParam'],
) {
  const touched = useRef(new Set<string>());
  return useCallback((values: CustomizerValues) => {
    const edits = params.flatMap((param) => {
      const value = values[param.name];
      if (value === undefined) return [];
      if (value !== param.defaultValue) touched.current.add(param.name);
      else if (!touched.current.has(param.name)) return [];
      return [{ name: param.name, value }];
    });
    return updateParam(edits, { bakeIntoSource: true });
  }, [params, updateParam]);
}

export function StudioModelCustomizer(props: StudioModelCustomizerProps): JSX.Element | null {
  const { code } = useCode();
  const { scriptParams, isComputing, error, updateParam, geometries } = useGeometry();
  const entries = useDeclaredParams(code, scriptParams);
  const params = useMemo(
    () => (entries ? customizerParamsFrom(entries, props.hints) : []),
    [entries, props.hints],
  );

  const execute = useParamExecutor(params, updateParam);
  // Only changed values are baked: an all-default export is the saved source.
  const exportModel = useCallback((
    format: CustomizerFormat,
    values: CustomizerValues,
    options?: ExportViaServerOptions,
  ) => exportViaServer(format, bakeParamValues(code, changedValues(params, values)), options), [code, params]);

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
      defaultFormat={defaultDownloadFormat(geometries?.length ?? 0)}
      layout={props.layout}
      defaultCollapsed={props.defaultCollapsed}
      className={props.className}
    />
  );
}
