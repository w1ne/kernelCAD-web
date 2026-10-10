// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/**
 * The embed's side of the widget channel: whether the hosting ChatGPT widget
 * accepts edit requests (it says so with a hello), posting a request, and
 * waiting for the widget's ack.
 */
import { useEffect, useState } from 'react';
import { isWidgetHello, readWidgetAck, type EditRequestMessage, type WidgetAck } from './editRequest';

/** True once the parent widget announced edit-request support for this instance. */
export function useWidgetAcceptsEdits(instanceId: string | undefined): boolean {
  const [accepts, setAccepts] = useState(false);
  useEffect(() => {
    if (!instanceId || typeof window === 'undefined' || window.parent === window) return undefined;
    const onMessage = (event: MessageEvent) => {
      if (event.source !== window.parent) return;
      if (isWidgetHello(event.data, instanceId)) setAccepts(true);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [instanceId]);
  return accepts;
}

/** How long to wait for the widget to confirm the chat took the message. */
export const ACK_TIMEOUT_MS = 15_000;

export type SendOutcome = WidgetAck | { requestId: string; ok: false; error: 'timeout' };

/** Post the request to the parent widget and resolve with its ack (or a timeout). */
export function postEditRequest(message: EditRequestMessage, timeoutMs = ACK_TIMEOUT_MS): Promise<SendOutcome> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || window.parent === window) {
      resolve({ requestId: message.requestId, ok: false, error: 'No chat window to send to.' });
      return;
    }
    const finish = (outcome: SendOutcome) => {
      window.clearTimeout(timer);
      window.removeEventListener('message', onMessage);
      resolve(outcome);
    };
    const onMessage = (event: MessageEvent) => {
      if (event.source !== window.parent) return;
      const ack = readWidgetAck(event.data, message.instanceId);
      if (ack && ack.requestId === message.requestId) finish(ack);
    };
    const timer = window.setTimeout(() => finish({ requestId: message.requestId, ok: false, error: 'timeout' }), timeoutMs);
    window.addEventListener('message', onMessage);
    window.parent.postMessage(message, '*');
  });
}
