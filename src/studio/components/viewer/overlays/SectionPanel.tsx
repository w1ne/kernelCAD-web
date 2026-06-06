import { useEffect, useMemo, useRef } from 'react';
import { useShellStore, shellStore } from '../../../store/useShellStore';
import { useRecomputeResult } from '../../../hooks/useRecomputeResult';
import { computeGeometryBox, sectionRange } from '../sectionRange';

const AXES: Array<'x' | 'y' | 'z'> = ['x', 'y', 'z'];

/**
 * Floating control for the section tool: axis (X/Y/Z), flip, and a position
 * slider ranged to the model's bounds. Self-contained — reads section state
 * from shellStore and model geometry via useRecomputeResult. Hidden unless
 * `visible`. View-only: writes nothing but section UI state.
 */
export function SectionPanel({ visible }: { visible: boolean }) {
  const { sectionAxis, sectionFlip, sectionPosition } = useShellStore();
  const { geometries } = useRecomputeResult();

  const box = useMemo(() => computeGeometryBox([...geometries]), [geometries]);
  const range = useMemo(
    () => (box ? sectionRange(box, sectionAxis) : { min: -50, max: 50, center: 0 }),
    [box, sectionAxis],
  );

  // On activate, and whenever the axis changes, re-center the plane to the
  // model's mid-bounds for that axis (a stale mm from another axis is useless).
  const wasVisible = useRef(false);
  const lastAxis = useRef(sectionAxis);
  useEffect(() => {
    if (!visible) { wasVisible.current = false; return; }
    if (!wasVisible.current || lastAxis.current !== sectionAxis) {
      shellStore.setSectionPosition(range.center);
    }
    wasVisible.current = true;
    lastAxis.current = sectionAxis;
  }, [visible, sectionAxis, range.center]);

  if (!visible) return null;
  const span = range.max - range.min;
  const step = span > 0 ? Math.max(span / 200, 0.1) : 1;

  return (
    <div
      data-testid="section-panel"
      className="absolute top-4 right-4 z-30 w-56 rounded border border-white/10 bg-black/80 p-3 text-xs text-white/90 shadow-lg select-none"
    >
      <div className="mb-2 font-medium">Section</div>
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
              className={`px-2 py-0.5 rounded uppercase ${
                sectionAxis === a ? 'bg-sky-600 text-white' : 'bg-[#222] text-white/70 hover:bg-[#333]'
              }`}
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
          min={range.min}
          max={range.max}
          step={step}
          value={sectionPosition}
          disabled={span <= 0}
          onChange={(e) => shellStore.setSectionPosition(Number(e.target.value))}
        />
        <span className="w-12 text-right tabular-nums">{sectionPosition.toFixed(1)}</span>
      </div>
    </div>
  );
}
