// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useEffect, useMemo, useRef } from 'react';
import { useShellStore, shellStore } from '../../../store/useShellStore';
import { useRecomputeResult } from '../../../hooks/useRecomputeResult';
import { useWorkbench } from '../../../context/WorkbenchContext';
import { computeGeometryBox, sectionRange } from '../sectionRange';
import { sectionPartKey } from '../sectionParts';
import { FloatingPanel } from '../../Shared/FloatingPanel';

const AXES: Array<'x' | 'y' | 'z'> = ['x', 'y', 'z'];

type AxesEnabled = Readonly<Record<'x' | 'y' | 'z', boolean>>;

// Presets are pure UI sugar over the per-axis enable flags: one enabled
// axis is a classic section plane, two a quarter wedge, three an octant
// corner. The rows stay fully editable after applying a preset.
const PRESETS: Array<{ id: string; label: string; enabled: AxesEnabled }> = [
  { id: 'plane', label: 'Plane', enabled: { x: false, y: false, z: true } },
  { id: 'quarter', label: 'Quarter', enabled: { x: true, y: true, z: false } },
  { id: 'octant', label: 'Octant', enabled: { x: true, y: true, z: true } },
];

type Range = { min: number; max: number; center: number };
const FALLBACK_RANGE: Range = { min: -50, max: 50, center: 0 };

/** Slider step over a range: ~200 stops, never finer than 0.1 mm. */
function sliderStep(r: Range): number {
  const span = r.max - r.min;
  return span > 0 ? Math.max(span / 200, 0.1) : 1;
}

const segBtn = (active: boolean) =>
  `px-2 py-0.5 rounded ${active ? 'bg-sky-600 text-white' : 'bg-[#222] text-white/70 hover:bg-[#333]'}`;

function PresetButtons({
  presetMatches,
  onApply,
}: {
  presetMatches: (enabled: AxesEnabled) => boolean;
  onApply: (enabled: AxesEnabled) => void;
}) {
  return (
    <div className="mb-2 flex gap-1">
      {PRESETS.map(({ id, label, enabled }) => (
        <button
          key={id}
          type="button"
          data-testid={`section-preset-${id}`}
          onClick={() => onApply(enabled)}
          aria-pressed={presetMatches(enabled)}
          className={segBtn(presetMatches(enabled))}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function AxisRow({
  axis,
  on,
  side,
  offset,
  range,
  onToggle,
  onToggleSide,
  onOffsetChange,
}: {
  axis: 'x' | 'y' | 'z';
  on: boolean;
  side: boolean;
  offset: number;
  range: Range;
  onToggle: (on: boolean) => void;
  onToggleSide: () => void;
  onOffsetChange: (value: number) => void;
}) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <label className="flex w-9 items-center gap-1">
        <input
          type="checkbox"
          data-testid={`section-axis-on-${axis}`}
          checked={on}
          onChange={(e) => onToggle(e.target.checked)}
        />
        <span className={`uppercase ${on ? 'text-white/80' : 'text-white/40'}`}>{axis}</span>
      </label>
      <button
        type="button"
        data-testid={`section-side-${axis}`}
        title="Which side of this axis is removed"
        aria-pressed={side}
        disabled={!on}
        onClick={onToggleSide}
        className="w-6 rounded bg-[#222] py-0.5 text-center text-white/80 hover:bg-[#333] disabled:opacity-40 disabled:hover:bg-[#222]"
      >
        {side ? '+' : '−'}
      </button>
      <input
        type="range"
        data-testid={`section-offset-${axis}`}
        className="flex-1 disabled:opacity-40"
        min={range.min}
        max={range.max}
        step={sliderStep(range)}
        value={offset}
        disabled={!on || range.max - range.min <= 0}
        onChange={(e) => onOffsetChange(Number(e.target.value))}
      />
      <span className={`w-10 text-right tabular-nums ${on ? '' : 'text-white/40'}`}>
        {offset.toFixed(1)}
      </span>
    </div>
  );
}

function KeepWholeList({
  partKeys,
  sectionKeepWhole,
  allExcluded,
}: {
  partKeys: string[];
  sectionKeepWhole: ReadonlySet<string>;
  allExcluded: boolean;
}) {
  return (
    <div className="mt-2 border-t border-white/10 pt-2">
      <div className="mb-1 text-white/60">Keep whole</div>
      <div className="max-h-36 overflow-y-auto">
        {partKeys.map((key) => (
          <label key={key} className="flex items-center gap-2 py-0.5">
            <input
              type="checkbox"
              data-testid={`section-keep-whole-${key}`}
              checked={sectionKeepWhole.has(key)}
              onChange={() => shellStore.toggleSectionKeepWhole(key)}
            />
            <span className="truncate">{key}</span>
          </label>
        ))}
      </div>
      {allExcluded && (
        <div className="mt-1 text-amber-400/80">All parts excluded — nothing is cut.</div>
      )}
    </div>
  );
}

/**
 * Floating, draggable control for the section tool. Each axis row can
 * contribute one cut plane (enable + removed-side + offset): one enabled
 * axis is a classic section plane, two a quarter wedge, three an octant
 * corner — one mechanism, the Plane/Quarter/Octant buttons are just
 * presets. A per-part "Keep whole" list excludes inner mechanisms from the
 * cut, explanatory-drawing style. Self-contained — reads section state from
 * shellStore and model geometry via useRecomputeResult. View-only: writes
 * nothing but section UI state.
 */
export function SectionPanel({ visible }: { visible: boolean }) {
  const { sectionAxesEnabled, sectionSides, sectionOffsets, sectionKeepWhole } = useShellStore();
  const { geometries } = useRecomputeResult();
  const { codeContext } = useWorkbench();

  const itemNames = useMemo(
    () => (codeContext?.returnedVariables as (string | null)[]) || [],
    [codeContext],
  );
  // Deduped: duplicate part names share one checkbox (toggling affects all).
  const partKeys = useMemo(
    () => [...new Set(geometries.map((g, i) => sectionPartKey(g, itemNames[i], i)))],
    [geometries, itemNames],
  );

  // Default to roughly where the static panel used to sit (top-right of the
  // viewer, clear of the inspector rail). Drag position is transient, like
  // the rest of the section state.
  const initialPos = useMemo(
    () => ({
      x: Math.max(16, (typeof window !== 'undefined' ? window.innerWidth : 1200) - 680),
      y: 88,
    }),
    [],
  );

  const box = useMemo(() => computeGeometryBox([...geometries]), [geometries]);
  const rangeFor = useMemo(
    () => (axis: 'x' | 'y' | 'z'): Range => (box ? sectionRange(box, axis) : FALLBACK_RANGE),
    [box],
  );

  // A newly-enabled axis starts at the model's mid-bounds — a stale mm from
  // an earlier model/session is useless.
  const enableAxis = (axis: 'x' | 'y' | 'z', on: boolean) => {
    if (on) shellStore.setSectionOffset(axis, rangeFor(axis).center);
    shellStore.setSectionAxisEnabled(axis, on);
  };

  const applyPreset = (enabled: AxesEnabled) => {
    for (const a of AXES) {
      if (enabled[a] && !sectionAxesEnabled[a]) {
        shellStore.setSectionOffset(a, rangeFor(a).center);
      }
    }
    shellStore.setSectionAxesEnabled(enabled);
  };

  // On activation, re-center every enabled axis to the current model bounds.
  const wasVisible = useRef(false);
  useEffect(() => {
    if (!visible) { wasVisible.current = false; return; }
    if (!wasVisible.current) {
      for (const a of AXES) {
        if (shellStore.getSnapshot().sectionAxesEnabled[a]) {
          shellStore.setSectionOffset(a, rangeFor(a).center);
        }
      }
    }
    wasVisible.current = true;
  }, [visible, rangeFor]);

  // Drop keep-whole keys that no longer exist in the scene.
  useEffect(() => {
    shellStore.pruneSectionKeepWhole(partKeys);
  }, [partKeys]);

  if (!visible) return null;

  const allExcluded = partKeys.length > 0 && partKeys.every((k) => sectionKeepWhole.has(k));
  const presetMatches = (enabled: AxesEnabled) =>
    AXES.every((a) => sectionAxesEnabled[a] === enabled[a]);
  const noneEnabled = AXES.every((a) => !sectionAxesEnabled[a]);

  return (
    <FloatingPanel
      id="section"
      title="Section"
      onClose={() => shellStore.setSectionMode(false)}
      initialPosition={initialPos}
      widthClassName="w-72"
    >
      <div data-testid="section-panel" className="text-xs text-white/90 select-none">
      <PresetButtons presetMatches={presetMatches} onApply={applyPreset} />

      {AXES.map((a) => (
        <AxisRow
          key={a}
          axis={a}
          on={sectionAxesEnabled[a]}
          side={sectionSides[a]}
          offset={sectionOffsets[a]}
          range={rangeFor(a)}
          onToggle={(next) => enableAxis(a, next)}
          onToggleSide={() => shellStore.setSectionSide(a, !sectionSides[a])}
          onOffsetChange={(value) => shellStore.setSectionOffset(a, value)}
        />
      ))}

      {noneEnabled && (
        <div className="mb-2 text-amber-400/80">No axis enabled — nothing is cut.</div>
      )}

      {partKeys.length > 0 && (
        <KeepWholeList
          partKeys={partKeys}
          sectionKeepWhole={sectionKeepWhole}
          allExcluded={allExcluded}
        />
      )}
      </div>
    </FloatingPanel>
  );
}
