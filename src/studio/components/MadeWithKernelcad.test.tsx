// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { EmbedAttributionBar, MadeWithKernelcad } from './MadeWithKernelcad';

afterEach(cleanup);

describe('MadeWithKernelcad', () => {
  it('links back to kernelcad.com tagged with the embed surface', () => {
    render(<MadeWithKernelcad surface="embed" />);
    const link = screen.getByTestId('made-with-kernelcad');
    expect(link.textContent).toBe('Made with kernelCAD');
    expect(link.getAttribute('href')).toBe('https://kernelcad.com/?ref=embed&utm_source=kernelcad&utm_medium=embed');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener');
  });

  it('tags the share page separately and accepts placement classes', () => {
    render(<MadeWithKernelcad surface="share" className="absolute bottom-2 left-2" />);
    const link = screen.getByTestId('made-with-kernelcad');
    expect(new URL(link.getAttribute('href')!).searchParams.get('ref')).toBe('share');
    expect(link.className).toContain('absolute bottom-2 left-2');
  });

  it('adds a Remix in kernelCAD link to the app project, tagged ref=embed-remix', () => {
    render(<MadeWithKernelcad surface="embed" className="fixed bottom-2 right-2" remixSlug="abc 1" />);
    const remix = screen.getByTestId('remix-in-kernelcad');
    expect(remix.textContent).toBe('Remix in kernelCAD');
    const url = new URL(remix.getAttribute('href')!);
    expect(url.origin + url.pathname).toBe('https://app.kernelcad.com/p/abc%201');
    expect(url.searchParams.get('remix')).toBe('1');
    expect(url.searchParams.get('ref')).toBe('embed-remix');
    expect(remix.getAttribute('target')).toBe('_blank');
    // Placement moves to the wrapper; the Made-with link is unchanged.
    const made = screen.getByTestId('made-with-kernelcad');
    expect(made.getAttribute('href')).toBe('https://kernelcad.com/?ref=embed&utm_source=kernelcad&utm_medium=embed');
    expect(made.parentElement!.className).toContain('fixed bottom-2 right-2');
  });

  it('renders no Remix link without a slug', () => {
    render(<MadeWithKernelcad surface="share" />);
    expect(screen.queryByTestId('remix-in-kernelcad')).toBeNull();
  });
});

describe('EmbedAttributionBar', () => {
  it('is a footer with the attribution and a Remix button to the app project', () => {
    render(<EmbedAttributionBar remixSlug="abc" />);
    const bar = screen.getByTestId('embed-attribution-bar');
    expect(bar.tagName).toBe('FOOTER');
    const made = screen.getByTestId('made-with-kernelcad');
    expect(made.textContent).toBe('Made with kernelCAD');
    expect(made.getAttribute('href')).toBe('https://kernelcad.com/?ref=embed&utm_source=kernelcad&utm_medium=embed');
    const remix = screen.getByTestId('remix-in-kernelcad');
    expect(remix.getAttribute('aria-label')).toBe('Remix in kernelCAD');
    expect(remix.textContent).toBe('Remix in kernelCAD');
    const url = new URL(remix.getAttribute('href')!);
    expect(url.origin + url.pathname).toBe('https://app.kernelcad.com/p/abc');
    expect(url.searchParams.get('ref')).toBe('embed-remix');
    expect(remix.getAttribute('target')).toBe('_blank');
    expect(bar.contains(made) && bar.contains(remix)).toBe(true);
  });

  it('offers no Remix without a slug', () => {
    render(<EmbedAttributionBar />);
    expect(screen.getByTestId('made-with-kernelcad')).toBeTruthy();
    expect(screen.queryByTestId('remix-in-kernelcad')).toBeNull();
  });
});

describe('links inside a host-chat widget (ChatGPT / Claude)', () => {
  const INSTANCE = 'w-1';
  const realParent = Object.getOwnPropertyDescriptor(window, 'parent');

  /** Pretend this page is the nested embed in a widget; returns what it posts up. */
  function hostedBy(): { posted: Array<Record<string, unknown>>; hello: (features: string[], instanceId?: string) => void } {
    const posted: Array<Record<string, unknown>> = [];
    const parent = { postMessage: vi.fn((data: Record<string, unknown>) => { posted.push(data); }) };
    Object.defineProperty(window, 'parent', { configurable: true, value: parent });
    const hello = (features: string[], instanceId = INSTANCE) => {
      const event = new MessageEvent('message', {
        data: { source: 'kernelcad-widget', type: 'kernelcad.widget-hello', v: 1, instanceId, features },
      });
      Object.defineProperty(event, 'source', { value: parent });
      act(() => { window.dispatchEvent(event); });
    };
    return { posted, hello };
  }

  afterEach(() => {
    if (realParent) Object.defineProperty(window, 'parent', realParent);
  });

  it('asks the widget to open Remix through the host instead of a dead target=_blank click', () => {
    const { posted, hello } = hostedBy();
    render(<EmbedAttributionBar remixSlug="abc" instanceId={INSTANCE} />);
    hello(['edit-request', 'marks-context', 'open-link']);
    const remix = screen.getByTestId('remix-in-kernelcad');
    // fireEvent returns false when the default (the in-frame navigation) was prevented.
    expect(fireEvent.click(remix)).toBe(false);
    expect(posted).toEqual([{
      source: 'kernelcad-embed',
      type: 'kernelcad.open-link',
      instanceId: INSTANCE,
      url: remix.getAttribute('href'),
    }]);
    expect(new URL(String(posted[0]!.url)).searchParams.get('remix')).toBe('1');

    expect(fireEvent.click(screen.getByTestId('made-with-kernelcad'))).toBe(false);
    expect(posted[1]).toMatchObject({ type: 'kernelcad.open-link', url: 'https://kernelcad.com/?ref=embed&utm_source=kernelcad&utm_medium=embed' });
  });

  it('keeps the plain link for a widget without open-link, another instance, or no widget', () => {
    const { posted, hello } = hostedBy();
    render(<EmbedAttributionBar remixSlug="abc" instanceId={INSTANCE} />);
    hello(['edit-request', 'marks-context'], INSTANCE);
    hello(['open-link'], 'someone-else');
    expect(fireEvent.click(screen.getByTestId('remix-in-kernelcad'))).toBe(true);
    cleanup();
    render(<EmbedAttributionBar remixSlug="abc" />);
    expect(fireEvent.click(screen.getByTestId('remix-in-kernelcad'))).toBe(true);
    expect(posted).toEqual([]);
  });

  it('routes the Studio-mode corner links the same way', () => {
    const { posted, hello } = hostedBy();
    render(<MadeWithKernelcad surface="embed" remixSlug="abc" instanceId={INSTANCE} />);
    hello(['open-link']);
    expect(fireEvent.click(screen.getByTestId('remix-in-kernelcad'))).toBe(false);
    expect(posted[0]).toMatchObject({ type: 'kernelcad.open-link', instanceId: INSTANCE });
  });
});
