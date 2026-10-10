// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment happy-dom
//
// The Mark & fix overlay: hidden until the hosting widget says hello, then a
// button that opens a panel; Send posts one edit request to the parent and
// closes on the widget's ack. The canvas half (raycast + pins) is replaced
// by a stub that drops a pin when clicked.
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import type { EditPick, EditRequestMessage } from './editRequest';

vi.mock('./MarkTapTool', () => ({
  MarkTapTool: (props: { onPick: (p: EditPick) => void }) => (
    <button
      type="button"
      data-testid="fake-tap"
      onClick={() => props.onPick({ featureId: 'roof', faceId: 3, surface: 'plane', point: [1, 2, 3], normal: [0, 0, 1] })}
    />
  ),
}));

import { useMarkFix, type MarkFixTarget } from './MarkFix';

const TARGET: MarkFixTarget = { slug: 'sedan', instanceId: 'inst-1', revision: 4 };

function Harness(props: { target?: MarkFixTarget; displayed?: boolean }) {
  const mark = useMarkFix({ target: props.target, geometries: [], displayed: props.displayed ?? true });
  return (
    <div>
      <div data-testid="canvas-slot">{mark.canvas as ReactNode}</div>
      {mark.overlay}
    </div>
  );
}

const parent = { postMessage: vi.fn() };

function fromParent(data: unknown) {
  const event = new MessageEvent('message', { data });
  Object.defineProperty(event, 'source', { value: parent });
  act(() => { window.dispatchEvent(event); });
}

const hello = { source: 'kernelcad-widget', type: 'kernelcad.widget-hello', instanceId: 'inst-1', features: ['edit-request'] };

beforeEach(() => {
  parent.postMessage.mockReset();
  Object.defineProperty(window, 'parent', { configurable: true, value: parent });
});

afterEach(() => {
  cleanup();
  Object.defineProperty(window, 'parent', { configurable: true, value: window });
});

describe('Mark & fix overlay', () => {
  it('stays hidden without a widget hello, or for another instance', () => {
    render(<Harness target={TARGET} />);
    expect(screen.queryByTestId('mark-fix-toggle')).toBeNull();
    fromParent({ ...hello, instanceId: 'someone-else' });
    expect(screen.queryByTestId('mark-fix-toggle')).toBeNull();
  });

  it('stays hidden outside ChatGPT (no target)', () => {
    render(<Harness />);
    fromParent(hello);
    expect(screen.queryByTestId('mark-fix-toggle')).toBeNull();
  });

  it('is disabled until the model is displayed', () => {
    render(<Harness target={TARGET} displayed={false} />);
    fromParent(hello);
    expect((screen.getByTestId('mark-fix-toggle') as HTMLButtonElement).disabled).toBe(true);
  });

  it('pins, notes and sends one edit request, then confirms', async () => {
    render(<Harness target={TARGET} />);
    fromParent(hello);
    fireEvent.click(screen.getByTestId('mark-fix-toggle'));
    const send = screen.getByTestId('mark-fix-send') as HTMLButtonElement;
    expect(send.disabled).toBe(true);

    fireEvent.click(screen.getByTestId('fake-tap'));
    expect(screen.getAllByTestId('mark-fix-chip')).toHaveLength(1);
    fireEvent.change(screen.getByTestId('mark-fix-note'), { target: { value: 'lower the roof here' } });
    expect(send.disabled).toBe(false);

    fireEvent.click(send);
    await vi.waitFor(() => expect(parent.postMessage).toHaveBeenCalledTimes(1));
    const [message, origin] = parent.postMessage.mock.calls[0] as [EditRequestMessage, string];
    expect(origin).toBe('*');
    expect(message).toMatchObject({
      source: 'kernelcad-embed',
      type: 'kernelcad.edit-request',
      v: 1,
      slug: 'sedan',
      revision: 4,
      instanceId: 'inst-1',
      note: 'lower the roof here',
      picks: [{ featureId: 'roof', faceId: 3, surface: 'plane', point: [1, 2, 3], normal: [0, 0, 1] }],
    });

    fromParent({ source: 'kernelcad-widget', type: 'kernelcad.edit-request-ack', instanceId: 'inst-1', requestId: message.requestId, ok: true });
    await vi.waitFor(() => expect(screen.getByTestId('mark-fix-sent')).toBeTruthy());
    expect(screen.queryByTestId('mark-fix-panel')).toBeNull();
  });

  it('keeps the panel and says so when the chat refuses', async () => {
    render(<Harness target={TARGET} />);
    fromParent(hello);
    fireEvent.click(screen.getByTestId('mark-fix-toggle'));
    fireEvent.click(screen.getByTestId('fake-tap'));
    fireEvent.change(screen.getByTestId('mark-fix-note'), { target: { value: 'smoother' } });
    fireEvent.click(screen.getByTestId('mark-fix-send'));
    await vi.waitFor(() => expect(parent.postMessage).toHaveBeenCalledTimes(1));
    const message = parent.postMessage.mock.calls[0]![0] as EditRequestMessage;
    fromParent({ source: 'kernelcad-widget', type: 'kernelcad.edit-request-ack', instanceId: 'inst-1', requestId: message.requestId, ok: false, error: 'The chat is busy.' });
    await vi.waitFor(() => expect(screen.getByRole('alert').textContent).toBe('The chat is busy.'));
    expect(screen.getByTestId('mark-fix-panel')).toBeTruthy();
    expect(screen.getAllByTestId('mark-fix-chip')).toHaveLength(1);
  });

  it('Cancel clears the pins and the note', () => {
    render(<Harness target={TARGET} />);
    fromParent(hello);
    fireEvent.click(screen.getByTestId('mark-fix-toggle'));
    fireEvent.click(screen.getByTestId('fake-tap'));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByTestId('mark-fix-panel')).toBeNull();
    fireEvent.click(screen.getByTestId('mark-fix-toggle'));
    expect(screen.queryAllByTestId('mark-fix-chip')).toHaveLength(0);
  });
});
