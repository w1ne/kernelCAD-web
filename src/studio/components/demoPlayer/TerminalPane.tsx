// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useEffect, useRef, useState } from 'react';

export interface TerminalLine {
  text: string;
  /** Wall-clock ms (relative to demo start) at which the line should be fully typed. */
  fullyTypedAtMs: number;
}

export interface TerminalPaneProps {
  lines: readonly TerminalLine[];
  width: number;
  height: number;
  /** Engine-clock provider (advanced by captureDemo via window.__demoPlayer). */
  getElapsedMs: () => number;
}

const CHARS_PER_SEC = 80;

export function TerminalPane({ lines, width, height, getElapsedMs }: TerminalPaneProps): React.JSX.Element {
  const [tick, setTick] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const loop = () => {
      setTick((n) => n + 1);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const elapsed = getElapsedMs();
  const visible: { text: string; cursor: boolean }[] = [];
  for (const line of lines) {
    const startMs = line.fullyTypedAtMs - (line.text.length / CHARS_PER_SEC) * 1000;
    if (elapsed < startMs) break;
    if (elapsed >= line.fullyTypedAtMs) {
      visible.push({ text: line.text, cursor: false });
    } else {
      const charsTyped = Math.floor(((elapsed - startMs) / 1000) * CHARS_PER_SEC);
      visible.push({ text: line.text.slice(0, charsTyped), cursor: true });
      break;
    }
  }
  const cursorVisible = Math.floor(tick / 30) % 2 === 0;

  return (
    <div
      data-testid="terminal-pane"
      style={{
        width,
        height,
        background: '#0c0c12',
        color: '#e6e6e6',
        fontFamily: 'JetBrains Mono, ui-monospace, monospace',
        fontSize: 20,
        lineHeight: '30px',
        padding: 32,
        overflow: 'hidden',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        boxSizing: 'border-box',
      }}
    >
      {visible.map((v, i) => (
        <div key={i}>
          {v.text}
          {v.cursor && cursorVisible ? <span style={{ background: '#e6e6e6', color: '#0c0c12' }}> </span> : null}
        </div>
      ))}
    </div>
  );
}
