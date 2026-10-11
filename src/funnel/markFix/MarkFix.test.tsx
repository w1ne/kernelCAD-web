// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment happy-dom
//
// Mark in the host-chat embed: hidden until the hosting widget says hello,
// then only a pencil toggle (plus Undo / Clear icons once there are marks).
// No panel, text box, Send button, hint or dialog. Every change posts the
// marks to the widget. The canvas half (brush + strokes) is replaced by a
// stub that paints a stroke when clicked.
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import type { MarksMessage, PaintHit } from './marks';
import type { PaintStroke } from './PaintTool';

const HIT: PaintHit = { featureId: 'roof', faceId: 3, surface: 'plane', point: [1, 2, 3], normal: [0, 0, 1], screen: [0.5, 0.4], brushMm: 2, shapeIndex: 0 };

vi.mock('./PaintTool', () => ({
  PaintTool: (props: { onStroke: (s: PaintStroke) => void; onUndo: () => void; strokes: readonly PaintStroke[]; active: boolean }) => (
    <>
      {props.active ? (
        <>
          <button type="button" data-testid="fake-paint" onClick={() => props.onStroke({ hits: [HIT, { ...HIT, point: [2, 2, 3] }], path: [[1, 2, 3.1], [2, 2, 3.1]] })} />
          <button type="button" data-testid="fake-two-finger-tap" onClick={props.onUndo} />
        </>
      ) : null}
      {props.strokes.map((_, i) => <span key={i} data-testid="fake-stroke" />)}
    </>
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

const hello = { source: 'kernelcad-widget', type: 'kernelcad.widget-hello', instanceId: 'inst-1', features: ['edit-request', 'marks-context'] };

function posts(type: string): Array<Record<string, unknown>> {
  return parent.postMessage.mock.calls.map((c) => c[0] as Record<string, unknown>).filter((m) => m.type === type);
}
const marksPosts = () => posts('kernelcad.marks') as unknown as MarksMessage[];

function setCoarse(coarse: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (q: string) => ({ matches: coarse && q.includes('coarse'), media: q, addEventListener() {}, removeEventListener() {} }),
  });
}

beforeEach(() => {
  parent.postMessage.mockReset();
  Object.defineProperty(window, 'parent', { configurable: true, value: parent });
  setCoarse(false);
});

afterEach(() => {
  cleanup();
  Object.defineProperty(window, 'parent', { configurable: true, value: window });
});

describe('Mark in a host chat', () => {
  it('stays hidden without a widget hello, for another instance, or outside a host (no target)', () => {
    const { unmount } = render(<Harness target={TARGET} />);
    expect(screen.queryByTestId('mark-toggle')).toBeNull();
    fromParent({ ...hello, instanceId: 'someone-else' });
    expect(screen.queryByTestId('mark-toggle')).toBeNull();
    unmount();
    render(<Harness />);
    fromParent(hello);
    expect(screen.queryByTestId('mark-toggle')).toBeNull();
  });

  it('is disabled until the model is displayed', () => {
    render(<Harness target={TARGET} displayed={false} />);
    fromParent(hello);
    expect((screen.getByTestId('mark-toggle') as HTMLButtonElement).disabled).toBe(true);
  });

  it('is paint only: a pencil toggle, then Undo / Clear icons; no panel, text, hint or dialog', () => {
    // An older widget that only knows edit-request also gets paint only.
    render(<Harness target={TARGET} />);
    fromParent({ ...hello, features: ['edit-request'] });
    const toggle = screen.getByTestId('mark-toggle');
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    expect(screen.queryByTestId('mark-undo')).toBeNull();
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByTestId('fake-paint'));
    expect(screen.getByTestId('mark-undo')).toBeTruthy();
    expect(screen.getByTestId('mark-clear')).toBeTruthy();

    const toolbar = screen.getByTestId('mark-toolbar');
    expect(toolbar.textContent?.trim()).toBe('');
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.queryByText(/send|what should change|tap the model|type the change/i)).toBeNull();
    expect(document.querySelectorAll('section, textarea, input, p')).toHaveLength(0);
  });

  it('posts nothing until the first stroke, then the marks after each change', async () => {
    render(<Harness target={TARGET} />);
    fromParent(hello);
    fireEvent.click(screen.getByTestId('mark-toggle'));
    await new Promise((r) => setTimeout(r, 300));
    expect(marksPosts()).toHaveLength(0);

    fireEvent.click(screen.getByTestId('fake-paint'));
    await vi.waitFor(() => expect(marksPosts()).toHaveLength(1));
    const first = marksPosts()[0]!;
    expect(parent.postMessage.mock.calls.find((c) => c[0] === first)?.[1]).toBe('*');
    expect(first).toMatchObject({
      source: 'kernelcad-embed',
      type: 'kernelcad.marks',
      v: 1,
      seq: 1,
      slug: 'sedan',
      revision: 4,
      instanceId: 'inst-1',
      picks: [{ featureId: 'roof', faceId: 3, surface: 'plane' }],
      strokes: [{ features: ['roof'], points: [[1, 2, 3], [2, 2, 3]], screen: [[0.5, 0.4], [0.5, 0.4]] }],
      regions: [{ featureId: 'roof', faceId: 3, share: 1, coverage: null }],
      bbox: { min: [1, 2, 3], max: [2, 2, 3] },
    });
    expect(first).not.toHaveProperty('note');

    fireEvent.click(screen.getByTestId('fake-paint'));
    await vi.waitFor(() => expect(marksPosts()).toHaveLength(2));
    expect(marksPosts()[1]!.strokes).toHaveLength(2);
    expect(marksPosts()[1]!.seq).toBe(2);

    fireEvent.click(screen.getByTestId('mark-undo'));
    await vi.waitFor(() => expect(marksPosts()).toHaveLength(3));
    expect(marksPosts()[2]!.strokes).toHaveLength(1);

    fireEvent.click(screen.getByTestId('fake-two-finger-tap'));
    await vi.waitFor(() => expect(marksPosts()).toHaveLength(4));
    expect(marksPosts()[3]!.strokes).toEqual([]);
    expect(screen.queryByTestId('mark-undo')).toBeNull();
    // Nothing is ever sent to the chat for the user.
    expect(posts('kernelcad.edit-request')).toHaveLength(0);
  });

  it('turning the pencil off keeps the marks drawn and in context; Clear removes them', async () => {
    render(<Harness target={TARGET} />);
    fromParent(hello);
    fireEvent.click(screen.getByTestId('mark-toggle'));
    fireEvent.click(screen.getByTestId('fake-paint'));
    await vi.waitFor(() => expect(marksPosts()).toHaveLength(1));
    fireEvent.click(screen.getByTestId('mark-toggle'));

    expect(screen.getByTestId('mark-toolbar').dataset.active).toBe('false');
    expect(screen.queryByTestId('fake-paint')).toBeNull();
    expect(screen.getAllByTestId('fake-stroke')).toHaveLength(1);
    await new Promise((r) => setTimeout(r, 300));
    expect(marksPosts()).toHaveLength(1);

    fireEvent.click(screen.getByTestId('mark-clear'));
    expect(screen.queryAllByTestId('fake-stroke')).toHaveLength(0);
    await vi.waitFor(() => expect(marksPosts()).toHaveLength(2));
    expect(marksPosts()[1]!.strokes).toEqual([]);
  });

  it('Escape turns the pencil off', () => {
    render(<Harness target={TARGET} />);
    fromParent(hello);
    fireEvent.click(screen.getByTestId('mark-toggle'));
    act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); });
    expect(screen.getByTestId('mark-toolbar').dataset.active).toBe('false');
  });

  it('a new revision starts with no marks and tells the widget', async () => {
    const { rerender } = render(<Harness target={TARGET} />);
    fromParent(hello);
    fireEvent.click(screen.getByTestId('mark-toggle'));
    fireEvent.click(screen.getByTestId('fake-paint'));
    await vi.waitFor(() => expect(marksPosts()).toHaveLength(1));
    rerender(<Harness target={{ ...TARGET, revision: 5 }} />);
    expect(screen.queryAllByTestId('fake-stroke')).toHaveLength(0);
    expect(screen.getByTestId('mark-toolbar').dataset.active).toBe('false');
    await vi.waitFor(() => expect(marksPosts()).toHaveLength(2));
    expect(marksPosts()[1]).toMatchObject({ revision: 5, strokes: [] });
  });

  it('asks the host for fullscreen when the pencil turns on with touch, not with a mouse', () => {
    render(<Harness target={TARGET} />);
    fromParent(hello);
    fireEvent.click(screen.getByTestId('mark-toggle'));
    fireEvent.click(screen.getByTestId('mark-toggle'));
    expect(posts('kernelcad.request-display-mode')).toHaveLength(0);

    setCoarse(true);
    fireEvent.click(screen.getByTestId('mark-toggle'));
    expect(posts('kernelcad.request-display-mode')).toEqual([
      { source: 'kernelcad-embed', type: 'kernelcad.request-display-mode', instanceId: 'inst-1', mode: 'fullscreen' },
    ]);
    fireEvent.click(screen.getByTestId('mark-toggle')); // off: no request
    expect(posts('kernelcad.request-display-mode')).toHaveLength(1);
  });
});
