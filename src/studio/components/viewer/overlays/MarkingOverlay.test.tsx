// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MarkingOverlay } from './MarkingOverlay';

// The overlay resolves a POST target from the URL; pin it to a single URL pair
// so the test asserts on a known endpoint.
vi.mock('./reviewPaintTargets', () => ({
  resolveReviewPaintTargets: () => ({
    slug: null,
    urls: ['http://test.invalid/save', 'http://test.invalid/fallback'],
  }),
}));

// No live three.js scene in the test — return an empty snapshot so the raycast
// helper short-circuits to zero struck parts.
vi.mock('../rendererSnapshot', () => ({
  rendererSnapshot: { scene: null, camera: null },
}));

/** jsdom's <canvas> has no real 2d context; stub just enough for the overlay's
 *  paint + read path so a pointer-down marks the canvas dirty and toDataURL
 *  returns a non-trivial data URL. */
function stubCanvas() {
  const ctxStub = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    lineCap: '',
    lineJoin: '',
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(0), width: 0, height: 0 })),
  } as unknown as CanvasRenderingContext2D;
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ctxStub) as unknown as HTMLCanvasElement['getContext'];
  HTMLCanvasElement.prototype.toDataURL = vi.fn(
    () => 'data:image/png;base64,' + 'A'.repeat(200),
  ) as unknown as HTMLCanvasElement['toDataURL'];
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
  // jsdom has no ResizeObserver — the overlay observes its parent for sizing.
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
}

describe('MarkingOverlay intent panel', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    stubCanvas();
    fetchMock = vi.fn(() => Promise.resolve({ ok: true, status: 200 } as Response));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('renders the note input and preset tag buttons', () => {
    render(<MarkingOverlay visible={true} />);
    expect(screen.getByTestId('marking-intent-panel')).toBeTruthy();
    expect(screen.getByTestId('marking-note-input')).toBeTruthy();
    expect(screen.getByTestId('marking-tag-too thick')).toBeTruthy();
    expect(screen.getByTestId('marking-tag-missing')).toBeTruthy();
  });

  it('tag buttons toggle aria-pressed', () => {
    render(<MarkingOverlay visible={true} />);
    const btn = screen.getByTestId('marking-tag-missing');
    expect(btn.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(btn);
    expect(btn.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(btn);
    expect(btn.getAttribute('aria-pressed')).toBe('false');
  });

  it('includes the trimmed note + selected tags in the saved packet meta', () => {
    vi.useFakeTimers();
    try {
      render(<MarkingOverlay visible={true} />);

      // Type a note and pick a tag.
      fireEvent.change(screen.getByTestId('marking-note-input'), {
        target: { value: '  side glass too thick  ' },
      });
      fireEvent.click(screen.getByTestId('marking-tag-too thick'));

      // Paint a stroke so the save isn't gated out as a blank canvas. The
      // pointer-up schedules a 500 ms debounced persist while still mounted.
      const canvas = screen.getByTestId('marking-overlay-canvas');
      fireEvent.pointerDown(canvas, { pointerId: 1, clientX: 10, clientY: 10 });
      fireEvent.pointerUp(canvas, { pointerId: 1, clientX: 10, clientY: 10 });
      vi.advanceTimersByTime(600);

      expect(fetchMock).toHaveBeenCalled();
      const [, init] = fetchMock.mock.calls[0]!;
      const body = JSON.parse((init as RequestInit).body as string) as {
        meta: { note: string; tags: string[] };
      };
      expect(body.meta.note).toBe('side glass too thick');
      expect(body.meta.tags).toEqual(['too thick']);
    } finally {
      vi.useRealTimers();
    }
  });

  it('omits intent by sending empty note + empty tags when none provided', () => {
    vi.useFakeTimers();
    try {
      render(<MarkingOverlay visible={true} />);
      const canvas = screen.getByTestId('marking-overlay-canvas');
      fireEvent.pointerDown(canvas, { pointerId: 1, clientX: 10, clientY: 10 });
      fireEvent.pointerUp(canvas, { pointerId: 1, clientX: 10, clientY: 10 });
      vi.advanceTimersByTime(600);

      expect(fetchMock).toHaveBeenCalled();
      const [, init] = fetchMock.mock.calls[0]!;
      const body = JSON.parse((init as RequestInit).body as string) as {
        meta: { note: string; tags: string[] };
      };
      expect(body.meta.note).toBe('');
      expect(body.meta.tags).toEqual([]);
    } finally {
      vi.useRealTimers();
    }
  });
});
