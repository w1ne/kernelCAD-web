// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment happy-dom
//
// The embed draws one status line of its own. FunnelViewer must be able to
// stay silent (no second "Building geometry…") while it still reports phases,
// and must pass the embed theme to the canvas background.
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

const harness = vi.hoisted(() => ({ viewerProps: null as null | { background?: string } }));

vi.mock('../../studio/context/WorkbenchContext', () => ({
  WorkbenchProvider: (props: { children: ReactNode }) => <div data-testid="workbench">{props.children}</div>,
  useWorkbench: () => ({
    geometries: [],
    previewGeometries: [],
    sketchesGeometries: [],
    showSketches: false,
    viewMode3D: 'solid',
    isReady: false,
    isComputing: true,
    error: null,
  }),
}));

vi.mock('../../studio/components/Viewer', () => ({
  default: (props: { background?: string }) => {
    harness.viewerProps = props;
    return <div data-testid="viewer-canvas" />;
  },
}));

import { FunnelViewer } from './FunnelViewer';
import type { FeedbackPayload } from '../../studio/components/Layout/feedbackApi';

afterEach(() => {
  cleanup();
  harness.viewerProps = null;
});

describe('FunnelViewer status overlay', () => {
  it('shows its own status text by default', () => {
    render(<FunnelViewer code="return box(1, 1, 1);" />);
    expect(screen.getByTestId('funnel-viewer-status').textContent).toBe('Building geometry…');
  });

  it('stays silent with statusOverlay={false} but still reports the phase', () => {
    const onPhaseChange = vi.fn();
    render(<FunnelViewer code="return box(1, 1, 1);" statusOverlay={false} onPhaseChange={onPhaseChange} />);
    expect(screen.queryByTestId('funnel-viewer-status')).toBeNull();
    expect(screen.queryByText('Building geometry…')).toBeNull();
    expect(onPhaseChange).toHaveBeenCalledWith('building_geometry', null);
  });

  it('keeps the mesh wait silent too', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
    render(<FunnelViewer code="" meshUrl="https://cdn.example/m.json" revision={2} statusOverlay={false} />);
    expect(screen.queryByText('Loading mesh…')).toBeNull();
    vi.unstubAllGlobals();
  });

  it('passes the background to the canvas', () => {
    render(<FunnelViewer code="return box(1, 1, 1);" background="light" />);
    expect(harness.viewerProps?.background).toBe('light');
  });
});

describe('FunnelViewer feedback button', () => {
  it('draws no button unless a feedback context is given', () => {
    render(<FunnelViewer code="return box(1, 1, 1);" />);
    expect(screen.queryByTestId('feedback-launcher')).toBeNull();
  });

  it('opens the feedback dialog and sends surface, slug, revision and url', async () => {
    const submit = vi.fn<(p: FeedbackPayload) => Promise<void>>().mockResolvedValue();
    render(
      <FunnelViewer
        code="return box(1, 1, 1);"
        revision={7}
        feedback={{ surface: 'chatgpt', slug: 'pipe-clamp' }}
        submitFeedback={submit}
      />,
    );
    expect(screen.queryByTestId('feedback-dialog')).toBeNull();

    fireEvent.click(screen.getByTestId('feedback-launcher'));
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'The hole is in the wrong place.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    await screen.findByRole('status');
    expect(submit).toHaveBeenCalledTimes(1);
    expect(submit.mock.calls[0][0]).toMatchObject({
      message: 'The hole is in the wrong place.',
      surface: 'chatgpt',
      slug: 'pipe-clamp',
      revision: 7,
      url: window.location.href,
    });
  });
});
