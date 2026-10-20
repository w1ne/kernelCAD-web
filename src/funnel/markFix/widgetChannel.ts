// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/**
 * The embed's side of the widget channel: whether a host-chat widget hosts
 * this instance (it says hello), and posting the current marks to it.
 */
import { useEffect, useState } from 'react';
import { readWidgetHello, type MarksMessage } from './marks';

/** The hosting widget's feature list once it said hello for this instance, else null. */
export function useWidgetFeatures(instanceId: string | undefined): readonly string[] | null {
  const [features, setFeatures] = useState<readonly string[] | null>(null);
  useEffect(() => {
    if (!instanceId || typeof window === 'undefined' || window.parent === window) return undefined;
    const onMessage = (event: MessageEvent) => {
      if (event.source !== window.parent) return;
      const next = readWidgetHello(event.data, instanceId);
      if (next) setFeatures((prev) => (prev && prev.join() === next.join() ? prev : next));
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [instanceId]);
  return features;
}

/** True once the parent widget said hello for this instance. */
export function useHostedByWidget(instanceId: string | undefined): boolean {
  return useWidgetFeatures(instanceId) !== null;
}

/**
 * Ask the hosting widget to open a link through the host chat. A link in this
 * nested frame does not open in host apps (the ChatGPT mobile app drops a
 * target=_blank click here), so the widget opens it with ui/open-link /
 * window.openai.openExternal. Only for widgets whose hello lists `open-link`.
 */
export function postOpenLink(instanceId: string, url: string): void {
  if (typeof window === 'undefined' || window.parent === window) return;
  window.parent.postMessage({ source: 'kernelcad-embed', type: 'kernelcad.open-link', instanceId, url }, '*');
}

/** Fire-and-forget: the widget turns this into host model context. */
export function postMarks(message: MarksMessage): void {
  if (typeof window === 'undefined' || window.parent === window) return;
  window.parent.postMessage(message, '*');
}

/**
 * Ask the host (through the widget) for fullscreen. Touch hosts such as the
 * Claude mobile app scroll the conversation on a vertical drag over an
 * inline widget, so painting needs the widget out of the scroll; the host's
 * composer stays visible in fullscreen. Widgets that do not know the message
 * ignore it.
 */
export function requestFullscreen(instanceId: string): void {
  if (typeof window === 'undefined' || window.parent === window) return;
  window.parent.postMessage({ source: 'kernelcad-embed', type: 'kernelcad.request-display-mode', instanceId, mode: 'fullscreen' }, '*');
}

/** True on touch-first devices (coarse primary pointer). */
export function isCoarsePointer(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
}
