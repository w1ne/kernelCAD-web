// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Light SVG charts for /stats — no chart library. One y-axis per chart, thin
// marks (≤24px columns with a 4px rounded data end, 2px lines), a 2px surface
// gap between stacked segments, recessive hairline grid, a tooltip on hover
// and on arrow keys, a legend for two or more series, and a table view under
// every chart so no value depends on colour or hover.

import { useId, useMemo, useState, type KeyboardEvent, type ReactNode } from 'react';

export interface Series {
  key: string;
  label: string;
  /** CSS colour, normally a `var(--kcs-…)` from palette.ts. */
  color: string;
  values: number[];
}

const W = 640;
const PAD = { t: 12, r: 44, b: 24, l: 40 };

/** A clean axis maximum (1, 2, 2.5, 5 × 10^n) at or above `v`. */
export function niceMax(v: number): number {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= v) return m * p;
  return 10 * p;
}

function shortDay(d: string): string {
  return d.slice(5); // YYYY-MM-DD → MM-DD
}

function fmtTick(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K` : String(Math.round(n * 100) / 100);
}

export function Legend({ series, mark }: { series: Series[]; mark: 'rect' | 'line' }): ReactNode {
  if (series.length < 2) return null;
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: 'var(--kcs-text-2)' }} aria-label="Legend">
      {series.map(s => (
        <li key={s.key} className="flex items-center gap-1.5">
          <svg width="14" height="10" aria-hidden="true">
            {mark === 'rect'
              ? <rect x="2" y="1" width="10" height="8" rx="2" style={{ fill: s.color }} />
              : <line x1="1" x2="13" y1="5" y2="5" strokeWidth="2" strokeLinecap="round" style={{ stroke: s.color }} />}
          </svg>
          {s.label}
        </li>
      ))}
    </ul>
  );
}

export function DataTable({ days, series, caption }: { days: string[]; series: Series[]; caption: string }): ReactNode {
  return (
    <details>
      <summary>Table</summary>
      <div className="kcs-scroll" style={{ maxHeight: 240, overflowY: 'auto' }}>
        <table>
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr>
              <th scope="col">Day</th>
              {series.map(s => <th key={s.key} scope="col" className="kcs-r">{s.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {days.map((d, i) => (
              <tr key={d}>
                <td>{d}</td>
                {series.map(s => <td key={s.key} className="kcs-r">{s.values[i] ?? 0}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function Tooltip({ day, series, index, xPct }: { day: string; series: Series[]; index: number; xPct: number }): ReactNode {
  const left = Math.min(Math.max(xPct, 12), 88);
  return (
    <div className="kcs-tip" role="status" style={{ left: `${left}%`, top: 0, transform: 'translateX(-50%)' }}>
      <div style={{ color: 'var(--kcs-muted)' }}>{day}</div>
      {series.map(s => (
        <div key={s.key} className="flex items-center gap-1.5">
          <svg width="10" height="4" aria-hidden="true">
            <line x1="0" x2="10" y1="2" y2="2" strokeWidth="2" style={{ stroke: s.color }} />
          </svg>
          <strong className="kcs-num">{s.values[index] ?? 0}</strong>
          <span style={{ color: 'var(--kcs-text-2)' }}>{s.label}</span>
        </div>
      ))}
    </div>
  );
}

function useHover(n: number) {
  const [hover, setHover] = useState<number | null>(null);
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); setHover(h => Math.min(n - 1, (h ?? -1) + 1)); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); setHover(h => Math.max(0, (h ?? n) - 1)); }
    else if (e.key === 'Escape') setHover(null);
  };
  return { hover, setHover, onKeyDown };
}

function Axes({ maxY, h, days, xAt }: { maxY: number; h: number; days: string[]; xAt: (i: number) => number }): ReactNode {
  const innerH = h - PAD.t - PAD.b;
  const ticks = [0, 0.5, 1].map(f => f * maxY);
  const labelIdx = days.length <= 1 ? [0] : [0, Math.floor((days.length - 1) / 2), days.length - 1];
  return (
    <g>
      {ticks.map(t => {
        const y = PAD.t + innerH - (t / maxY) * innerH;
        return (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y} y2={y} strokeWidth={1}
              style={{ stroke: t === 0 ? 'var(--kcs-axis)' : 'var(--kcs-grid)' }} />
            <text x={PAD.l - 6} y={y + 3} textAnchor="end" fontSize={10} className="kcs-num" style={{ fill: 'var(--kcs-muted)' }}>
              {fmtTick(t)}
            </text>
          </g>
        );
      })}
      {labelIdx.map(i => (
        <text key={i} x={xAt(i)} y={h - 6} textAnchor="middle" fontSize={10} style={{ fill: 'var(--kcs-muted)' }}>
          {shortDay(days[i] ?? '')}
        </text>
      ))}
    </g>
  );
}

function Empty({ text }: { text: string }): ReactNode {
  return (
    <div data-testid="chart-empty" className="flex items-center justify-center text-sm rounded-lg"
      style={{ height: 120, color: 'var(--kcs-muted)', background: 'var(--kcs-wash)' }}>
      {text}
    </div>
  );
}

/** Rounded-top rect path (square at the bottom). */
function topRounded(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.min(r, w / 2, h);
  return `M${x},${y + h} V${y + rr} Q${x},${y} ${x + rr},${y} H${x + w - rr} Q${x + w},${y} ${x + w},${y + rr} V${y + h} Z`;
}

/** Columns per day; several series stack in the given order. */
export function ColumnChart({ days, series, label, height = 170, empty = 'Nothing in this window.' }: {
  days: string[]; series: Series[]; label: string; height?: number; empty?: string;
}): ReactNode {
  const { hover, setHover, onKeyDown } = useHover(days.length);
  const totals = useMemo(() => days.map((_, i) => series.reduce((a, s) => a + (s.values[i] ?? 0), 0)), [days, series]);
  const maxY = niceMax(Math.max(0, ...totals));
  if (totals.every(t => t === 0)) return <><Empty text={empty} /><DataTable days={days} series={series} caption={label} /></>;

  const innerW = W - PAD.l - PAD.r;
  const innerH = height - PAD.t - PAD.b;
  const band = innerW / Math.max(days.length, 1);
  const barW = Math.max(1, Math.min(24, band - 2));
  const xAt = (i: number) => PAD.l + band * i + band / 2;
  const hPx = (v: number) => (v / maxY) * innerH;

  return (
    <div>
      <Legend series={series} mark="rect" />
      <div className="relative" onMouseLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${W} ${height}`} width="100%" height={height} role="img" aria-label={label}
          tabIndex={0} onKeyDown={onKeyDown} onBlur={() => setHover(null)} style={{ display: 'block', outline: 'none' }}>
          <Axes maxY={maxY} h={height} days={days} xAt={xAt} />
          {days.map((d, i) => {
            let y = PAD.t + innerH;
            const segs = series.map(s => ({ s, v: s.values[i] ?? 0 })).filter(x => x.v > 0);
            return (
              <g key={d} opacity={hover === null || hover === i ? 1 : 0.55}>
                {segs.map((seg, k) => {
                  const h = hPx(seg.v);
                  // 2px surface gap between stacked segments.
                  const gap = k > 0 ? 2 : 0;
                  y -= h;
                  const top = k === segs.length - 1;
                  const x = xAt(i) - barW / 2;
                  const hh = Math.max(0.5, h - gap);
                  return top
                    ? <path key={seg.s.key} d={topRounded(x, y, barW, hh, 4)} style={{ fill: seg.s.color }} />
                    : <rect key={seg.s.key} x={x} y={y} width={barW} height={hh} style={{ fill: seg.s.color }} />;
                })}
                <rect data-testid="column-hit" x={PAD.l + band * i} y={PAD.t} width={band} height={innerH} fill="transparent"
                  onMouseEnter={() => setHover(i)} />
              </g>
            );
          })}
        </svg>
        {hover !== null && (
          <Tooltip day={days[hover] ?? ''} series={series} index={hover} xPct={(xAt(hover) / W) * 100} />
        )}
      </div>
      <DataTable days={days} series={series} caption={label} />
    </div>
  );
}

/** Lines per day on one y-axis; the last value is labelled at the right end. */
export function LineChart({ days, series, label, height = 170, empty = 'Nothing in this window.' }: {
  days: string[]; series: Series[]; label: string; height?: number; empty?: string;
}): ReactNode {
  const { hover, setHover, onKeyDown } = useHover(days.length);
  const clipId = useId();
  const maxRaw = Math.max(0, ...series.flatMap(s => s.values));
  if (maxRaw === 0) return <><Empty text={empty} /><DataTable days={days} series={series} caption={label} /></>;
  const maxY = niceMax(maxRaw);
  const innerW = W - PAD.l - PAD.r;
  const innerH = height - PAD.t - PAD.b;
  const xAt = (i: number) => PAD.l + (days.length <= 1 ? innerW / 2 : (i / (days.length - 1)) * innerW);
  const yAt = (v: number) => PAD.t + innerH - (v / maxY) * innerH;
  const last = days.length - 1;

  const pointerToIndex = (clientX: number, rect: DOMRect) => {
    const x = ((clientX - rect.left) / rect.width) * W;
    const i = Math.round(((x - PAD.l) / innerW) * (days.length - 1));
    return Math.min(last, Math.max(0, i));
  };

  return (
    <div>
      <Legend series={series} mark="line" />
      <div className="relative" onMouseLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${W} ${height}`} width="100%" height={height} role="img" aria-label={label}
          tabIndex={0} onKeyDown={onKeyDown} onBlur={() => setHover(null)} style={{ display: 'block', outline: 'none' }}
          onMouseMove={e => setHover(pointerToIndex(e.clientX, e.currentTarget.getBoundingClientRect()))}>
          <clipPath id={clipId}><rect x={0} y={0} width={W} height={height} /></clipPath>
          <Axes maxY={maxY} h={height} days={days} xAt={xAt} />
          {hover !== null && (
            <line x1={xAt(hover)} x2={xAt(hover)} y1={PAD.t} y2={PAD.t + innerH} strokeWidth={1} style={{ stroke: 'var(--kcs-axis)' }} />
          )}
          <g clipPath={`url(#${clipId})`}>
            {series.map(s => (
              <polyline key={s.key} fill="none" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round"
                style={{ stroke: s.color }}
                points={s.values.map((v, i) => `${xAt(i).toFixed(1)},${yAt(v).toFixed(1)}`).join(' ')} />
            ))}
            {series.map(s => (
              <g key={s.key}>
                <circle cx={xAt(hover ?? last)} cy={yAt(s.values[hover ?? last] ?? 0)} r={4} strokeWidth={2}
                  style={{ fill: s.color, stroke: 'var(--kcs-surface)' }} />
              </g>
            ))}
            {hover === null && series.map(s => (
              <text key={s.key} x={xAt(last) + 8} y={yAt(s.values[last] ?? 0) + 3} fontSize={10} className="kcs-num"
                style={{ fill: 'var(--kcs-text-2)' }}>
                {s.values[last] ?? 0}
              </text>
            ))}
          </g>
        </svg>
        {hover !== null && (
          <Tooltip day={days[hover] ?? ''} series={series} index={hover} xPct={(xAt(hover) / W) * 100} />
        )}
      </div>
      <DataTable days={days} series={series} caption={label} />
    </div>
  );
}

/** A 0..1 meter: blue fill on a lighter blue track, the value as text beside it. */
export function Meter({ value, label }: { value: number | null; label: string }): ReactNode {
  const pct = value === null ? 0 : Math.max(0, Math.min(1, value)) * 100;
  return (
    <span className="inline-flex items-center gap-2" style={{ minWidth: 110 }}>
      <span role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100}
        aria-valuenow={value === null ? undefined : Math.round(pct)}
        style={{ display: 'inline-block', width: 64, height: 6, borderRadius: 3, background: 'var(--kcs-track)', overflow: 'hidden' }}>
        <span style={{ display: 'block', width: `${pct}%`, height: '100%', background: 'var(--kcs-series-1)' }} />
      </span>
      <span className="kcs-num" style={{ color: 'var(--kcs-text)' }}>{value === null ? '—' : `${Math.round(pct)}%`}</span>
    </span>
  );
}
