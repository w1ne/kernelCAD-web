// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { GenerationProgress } from '../../funnel/components/GenerationProgress';
import type { GenerationPhase } from '../../funnel/hooks/useGeneration';
import type { LiveCode } from '../../funnel/lib/liveCode';
import { RunProgress } from './GenerationStatus';

afterEach(() => cleanup());

const RUNNING: GenerationPhase = { state: 'running', lastEvent: { kind: 'status', phase: 'running' } };
const live = (attempt: number, code: string): LiveCode => ({ attempt, code, final: false });

describe('live code while the agent writes', () => {
  it('shows the streamed script in the Studio run card', () => {
    render(<RunProgress phase={RUNNING} events={[]} liveCode={live(1, 'const plate = box(40, 20, 3);\nreturn plate;')} onCancel={vi.fn()} />);
    expect(screen.getByTestId('live-code-text')).toHaveTextContent('const plate = box(40, 20, 3);');
    expect(screen.getByTestId('live-code-heading')).toHaveTextContent('Writing the script');
    expect(screen.getByTestId('live-code-heading')).toHaveTextContent('2 lines');
  });

  it('names a fix attempt and follows the newest line', () => {
    const { rerender } = render(<RunProgress phase={RUNNING} events={[]} liveCode={live(2, 'a')} onCancel={vi.fn()} />);
    expect(screen.getByTestId('live-code-heading')).toHaveTextContent('Attempt 2 — fixing');
    const pre = screen.getByTestId('live-code-text');
    Object.defineProperty(pre, 'scrollHeight', { configurable: true, value: 500 });
    rerender(<RunProgress phase={RUNNING} events={[]} liveCode={live(2, 'a\nb\nc')} onCancel={vi.fn()} />);
    expect(pre.scrollTop).toBe(500);
  });

  it('shows nothing without streamed code (an older server) or after the run', () => {
    render(<RunProgress phase={RUNNING} events={[]} liveCode={null} onCancel={vi.fn()} />);
    expect(screen.queryByTestId('live-code')).toBeNull();
    cleanup();
    render(<RunProgress phase={{ state: 'error', code: 'timeout', message: 'm' }} events={[]} liveCode={live(1, 'x')} onCancel={vi.fn()} />);
    expect(screen.queryByTestId('live-code')).toBeNull();
  });

  it('shows the streamed script on the funnel generate page', () => {
    render(<GenerationProgress events={[]} liveCode={live(1, 'return sphere(10);')} />);
    expect(screen.getByTestId('live-code-text')).toHaveTextContent('return sphere(10);');
  });
});
