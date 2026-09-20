// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useEffect, useState } from 'react';
import { geometryEngine, type GeometryResult } from '../../shared/worker/geometryEngine';
import { SIZE_LIMITS, STARTERS, starterCode, type Dimension, type StarterId, type StarterModel } from './starterModels';

type Preview = { code: string; geometries: GeometryResult[] };
export function useStarterModel() {
  const [attempt, setAttempt] = useState(0);
  const [history, setHistory] = useState<StarterModel[]>([]);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [failure, setFailure] = useState<{ code: string; message: string } | null>(null);
  const model = history.at(-1) ?? null;
  const code = model ? starterCode(model) : '';

  useEffect(() => {
    if (!code) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      geometryEngine.executeCode(code).then(result => {
        if (cancelled) return;
        if (result.geometries.length === 0) throw new Error('Empty model');
        setPreview({ code, geometries: result.geometries });
        setFailure(null);
      }).catch(() => {
        if (!cancelled) setFailure({ code, message: 'Could not update. Undo or choose an example.' });
      });
    }, 180);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [code, attempt]);

  const error = failure?.code === code ? failure.message : null;
  const ready = Boolean(code && preview?.code === code && !error);
  const select = (id: StarterId) => {
    const next = STARTERS.find(item => item.id === id);
    if (next) {
      setHistory([next]);
      setAttempt(value => value + 1);
      setFailure(null);
    }
  };
  const resize = (dimension: Dimension, value: number) => {
    if (!Number.isFinite(value)) return;
    const { min, max } = SIZE_LIMITS[dimension];
    const bounded = Math.max(min, Math.min(max, Math.round(value)));
    setHistory(items => {
      const current = items.at(-1);
      if (!current || current.sizes[dimension] === bounded) return items;
      return [...items.slice(-49), { ...current, sizes: { ...current.sizes, [dimension]: bounded } }];
    });
  };
  const undo = () => {
    setHistory(items => items.length > 1 ? items.slice(0, -1) : items);
    setFailure(null);
  };
  const exportModel = async (format: 'stl' | 'step') => {
    if (!ready) throw new Error('Wait for your model to finish.');
    return format === 'stl' ? geometryEngine.exportSTL(code) : geometryEngine.exportSTEP(code);
  };
  return { model, code, geometries: preview?.geometries ?? [], ready, error, select, resize, undo, canUndo: history.length > 1, exportModel };
}
