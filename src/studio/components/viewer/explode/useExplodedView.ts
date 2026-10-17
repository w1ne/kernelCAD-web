// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GeometryResult } from '../../../../shared/worker/geometryEngine';
import type { FeatureRecord } from '../../../../shared/intent/featureRecord';
import { explodedGeometries, explodeParts, layoutForView, poseSignature } from './explodeModel';

/** Slider at 100 % = the layout's full explode (factor 1). */
export const EXPLODE_DEFAULT_AMOUNT = 0.6;
const TRANSITION_MS = 450;

const easeInOut = (t: number): number => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

export interface ExplodedView {
  /** At least two parts: the toggle is worth showing. */
  available: boolean;
  on: boolean;
  /** Slider value 0..1. */
  amount: number;
  setAmount: (amount: number) => void;
  toggle: () => void;
  /** 'mates' when mate / joint links drive the layout, else 'radial'. */
  mode: 'mates' | 'radial';
  /** The meshes to draw: the input itself when not exploded. */
  geometries: GeometryResult[];
}

/** Exploded-view state for one viewer. Viewport only: it draws translated
 *  copies and never writes the script, params or the transform overrides. It
 *  turns itself off when the displayed model changes underneath it
 *  (animation playback, a joint drag, a param or code edit). */
export function useExplodedView(
  geometries: GeometryResult[],
  featureRecords: readonly FeatureRecord[] | undefined,
): ExplodedView {
  const [on, setOn] = useState(false);
  const [amount, setAmountState] = useState(EXPLODE_DEFAULT_AMOUNT);
  const [shown, setShown] = useState(0);
  const shownRef = useRef(0);
  shownRef.current = shown;

  const available = useMemo(() => explodeParts(geometries).parts.length >= 2, [geometries]);

  // The layout is computed against the pose the user exploded from.
  const signature = useMemo(() => poseSignature(geometries), [geometries]);
  const active = on || shown > 0;
  const view = useMemo(
    () => (active ? layoutForView(geometries, featureRecords ?? []) : null),
    // Recompute only for a new model, not for every frame of the transition.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [active, signature, featureRecords],
  );

  // Another driver moved the model: drop the explode at once, no transition.
  const lastSignature = useRef(signature);
  useEffect(() => {
    if (lastSignature.current === signature) return;
    lastSignature.current = signature;
    setOn(false);
    setShown(0);
  }, [signature]);

  const target = on ? amount : 0;
  const lastOn = useRef(on);
  useEffect(() => {
    const from = shownRef.current;
    const toggled = lastOn.current !== on;
    lastOn.current = on;
    if (from === target) return undefined;
    // The slider follows the pointer; only the toggle itself animates.
    if (!toggled || typeof requestAnimationFrame !== 'function') {
      setShown(target);
      return undefined;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number): void => {
      const t = Math.min(1, (now - start) / TRANSITION_MS);
      setShown(from + (target - from) * easeInOut(t));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, on]);

  const toggle = useCallback(() => setOn((v) => !v), []);
  const setAmount = useCallback((a: number) => {
    setAmountState(Math.min(1, Math.max(0, Number.isFinite(a) ? a : 0)));
  }, []);

  const shownGeometries = useMemo(
    () => (view && shown > 0 ? explodedGeometries(geometries, view.layout, shown) : geometries),
    [geometries, view, shown],
  );

  return {
    available,
    on,
    amount,
    setAmount,
    toggle,
    mode: view?.layout.mode ?? 'radial',
    geometries: shownGeometries,
  };
}
