// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/**
 * The embed's side of the widget channel: whether a host-chat widget hosts
 * this instance (it says hello), and posting the current marks to it.
 */
import { useEffect, useState } from 'react';
import { readWidgetHello, type MarksMessage } from './marks';

/** True once the parent widget said hello for this instance. */
export function useHostedByWidget(instanceId: string | undefined): boolean {
  const [hosted, setHosted] = useState(false);
  useEffect(() => {
    if (!instanceId || typeof window === 'undefined' || window.parent === window) return undefined;
    const onMessage = (event: MessageEvent) => {
      if (event.source !== window.parent) return;
      if (readWidgetHello(event.data, instanceId)) setHosted(true);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [instanceId]);
  return hosted;
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
