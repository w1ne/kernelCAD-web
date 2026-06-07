import { useEffect, useMemo, useRef } from 'react';
import { useShellStore, shellStore } from '../../../store/useShellStore';
import { useRecomputeResult } from '../../../hooks/useRecomputeResult';
import { useWorkbench } from '../../../context/WorkbenchContext';
import { computeGeometryBox, sectionRange } from '../sectionRange';
import { sectionPartKey } from '../sectionParts';
import type { SectionShape } from '../../../store/shellStore';

const AXES: Array<'x' | 'y' | 'z'> = ['x', 'y', 'z'];
const SHAPES: Array<{ id: SectionShape; label: string }> = [
  { id: 'plane', label: 'Plane' },
  { id: 'quarter', label: 'Quarter' },
  { id: 'octant', label: 'Octant' },
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

/**
 * Floating control for the section tool. Three cut shapes: Plane (the
 * original single plane), Quarter (wedge around one axis) and Octant
 * (corner box), plus a per-part "Keep whole" exclusion list so inner
 * mechanisms can stay uncut, explanatory-drawing style. Self-contained —
 * reads section state from shellStore and model geometry via
 * useRecomputeResult. View-only: writes nothing but section UI state.
 */
export function SectionPanel({ visible }: { visible: boolean }) {
  const {
    sectionShape, sectionAxis, sectionFlip, sectionPosition,
    sectionSides, sectionOffsets, sectionQuarterAxis, sectionKeepWhole,
  } = useShellStore();
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

  const box = useMemo(() => computeGeometryBox([...geometries]), [geometries]);
  const rangeFor = useMemo(
    () => (axis: 'x' | 'y' | 'z'): Range => (box ? sectionRange(box, axis) : FALLBACK_RANGE),
    [box],
  );
  const planeRange = rangeFor(sectionAxis);

  // Plane mode: on activate, and whenever the axis changes, re-center the
  // plane to the model's mid-bounds for that axis (unchanged behaviour).
  const wasVisible = useRef(false);
  const lastAxis = useRef(sectionAxis);
  useEffect(() => {
    if (!visible) { wasVisible.current = false; return; }
    if (!wasVisible.current || lastAxis.current !== sectionAxis) {
      shellStore.setSectionPosition(planeRange.center);
    }
    wasVisible.current = true;
    lastAxis.current = sectionAxis;
  }, [visible, sectionAxis, planeRange.center]);

  // Cutaway modes: re-center all offsets when the shape, quarter axis, or
  // model bounds change — a stale mm from another pairing is useless.
  useEffect(() => {
    if (!visible || sectionShape === 'plane') return;
    for (const a of AXES) shellStore.setSectionOffset(a, rangeFor(a).center);
  }, [visible, sectionShape, sectionQuarterAxis, rangeFor]);

  // Drop keep-whole keys that no longer exist in the scene.
  useEffect(() => {
    shellStore.pruneSectionKeepWhole(partKeys);
  }, [partKeys]);

  if (!visible) return null;

  const cutAxes = sectionShape === 'quarter'
    ? AXES.filter((a) => a !== sectionQuarterAxis)
    : AXES;
  const allExcluded = partKeys.length > 0 && partKeys.every((k) => sectionKeepWhole.has(k));
  const planeStep = sliderStep(planeRange);

  return (
    <div
      data-testid="section-panel"
      className="absolute top-4 right-4 z-30 w-64 rounded border border-white/10 bg-black/80 p-3 text-xs text-white/90 shadow-lg select-none"
    >
      <div className="mb-2 font-medium">Section</div>

      <div className="mb-2 flex gap-1">
        {SHAPES.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            data-testid={`section-shape-${id}`}
            onClick={() => shellStore.setSectionShape(id)}
            aria-pressed={sectionShape === id}
            className={segBtn(sectionShape === id)}
          >
            {label}
          </button>
        ))}
      </div>

      {sectionShape === 'plane' && (
        <>
          <div className="mb-2 flex items-center gap-2">
            <span className="text-white/60">Axis</span>
            <div className="flex gap-1">
              {AXES.map((a) => (
                <button
                  key={a}
                  type="button"
                  data-testid={`section-axis-${a}`}
                  onClick={() => shellStore.setSectionAxis(a)}
                  aria-pressed={sectionAxis === a}
                  className={`uppercase ${segBtn(sectionAxis === a)}`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
          <label className="mb-2 flex items-center gap-2">
            <input
              type="checkbox"
              data-testid="section-flip"
              checked={sectionFlip}
              onChange={(e) => shellStore.setSectionFlip(e.target.checked)}
            />
            <span className="text-white/60">Flip side</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              data-testid="section-position"
              className="flex-1"
              min={planeRange.min}
              max={planeRange.max}
              step={planeStep}
              value={sectionPosition}
              disabled={planeRange.max - planeRange.min <= 0}
              onChange={(e) => shellStore.setSectionPosition(Number(e.target.value))}
            />
            <span className="w-12 text-right tabular-nums">{sectionPosition.toFixed(1)}</span>
          </div>
        </>
      )}

      {sectionShape === 'quarter' && (
        <div className="mb-2 flex items-center gap-2">
          <span className="text-white/60">Around</span>
          <div className="flex gap-1">
            {AXES.map((a) => (
              <button
                key={a}
                type="button"
                data-testid={`section-around-${a}`}
                onClick={() => shellStore.setSectionQuarterAxis(a)}
                aria-pressed={sectionQuarterAxis === a}
                className={`uppercase ${segBtn(sectionQuarterAxis === a)}`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>
      )}

      {sectionShape !== 'plane' && cutAxes.map((a) => {
        const r = rangeFor(a);
        return (
          <div key={a} className="mb-2 flex items-center gap-2">
            <span className="w-3 uppercase text-white/60">{a}</span>
            <button
              type="button"
              data-testid={`section-side-${a}`}
              title="Which side of this axis is removed"
              onClick={() => shellStore.setSectionSide(a, !sectionSides[a])}
              className="w-6 rounded bg-[#222] py-0.5 text-center text-white/80 hover:bg-[#333]"
            >
              {sectionSides[a] ? '+' : '−'}
            </button>
            <input
              type="range"
              data-testid={`section-offset-${a}`}
              className="flex-1"
              min={r.min}
              max={r.max}
              step={sliderStep(r)}
              value={sectionOffsets[a]}
              disabled={r.max - r.min <= 0}
              onChange={(e) => shellStore.setSectionOffset(a, Number(e.target.value))}
            />
            <span className="w-10 text-right tabular-nums">{sectionOffsets[a].toFixed(1)}</span>
          </div>
        );
      })}

      {partKeys.length > 0 && (
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
      )}
    </div>
  );
}
