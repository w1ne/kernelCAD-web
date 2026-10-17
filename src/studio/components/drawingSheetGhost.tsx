// SPDX-License-Identifier: MIT

interface Ghost { a: [number, number]; b: [number, number]; label: string }

function ghostMarkup(ghost: Ghost): string {
  const [a, b] = [ghost.a, ghost.b];
  const horizontal = Math.abs(b[0] - a[0]) >= Math.abs(b[1] - a[1]);
  const n = (v: number) => String(Math.round(v * 1000) / 1000);
  const line = (x1: number, y1: number, x2: number, y2: number) =>
    `<line x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}" stroke="currentColor" stroke-width="0.25"/>`;
  if (horizontal) {
    const y = Math.min(a[1], b[1]) - 8;
    return line(a[0], a[1], a[0], y) + line(b[0], b[1], b[0], y) + line(a[0], y, b[0], y) +
      `<text x="${n((a[0] + b[0]) / 2)}" y="${n(y - 1.2)}" text-anchor="middle" font-size="3.2" fill="currentColor" stroke="none">${ghost.label}</text>`;
  }
  const x = Math.max(a[0], b[0]) + 8;
  const midY = (a[1] + b[1]) / 2;
  return line(a[0], a[1], x, a[1]) + line(b[0], b[1], x, b[1]) + line(x, a[1], x, b[1]) +
    `<text x="${n(x + 1.2)}" y="${n(midY)}" text-anchor="middle" font-size="3.2" fill="currentColor" stroke="none" transform="rotate(-90 ${n(x + 1.2)} ${n(midY)})">${ghost.label}</text>`;
}

export function GhostOverlay({ box, ghosts }: { box: { width: number; height: number }; ghosts: Ghost[] }) {
  return <svg className="pointer-events-none absolute left-0 top-0 text-blueprint" aria-hidden="true" viewBox={`0 0 ${box.width} ${box.height}`} width={box.width} height={box.height} dangerouslySetInnerHTML={{ __html: ghosts.map(ghostMarkup).join('') }} />;
}
