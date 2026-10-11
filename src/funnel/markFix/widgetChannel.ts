// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/**
 * The embed's side of the widget channel: whether the hosting ChatGPT widget
 * accepts edit requests (it says so with a hello), posting a request, and
 * waiting for the widget's ack.
 */
import { useEffect, useState } from 'react';
import { readWidgetAck, readWidgetHello, type EditRequestMessage, type MarksMessage, type WidgetAck } from './editRequest';

export interface WidgetSupport {
  /** The widget can post a composed edit message into the chat (legacy panel). */
  editRequest: boolean;
  /** The widget forwards the live marks into the host model's context: paint only. */
  marksContext: boolean;
}

const NONE: WidgetSupport = { editRequest: false, marksContext: false };

/** What the parent widget announced for this instance (nothing until its hello). */
export function useWidgetSupport(instanceId: string | undefined): WidgetSupport {
  const [support, setSupport] = useState<WidgetSupport>(NONE);
  useEffect(() => {
    if (!instanceId || typeof window === 'undefined' || window.parent === window) return undefined;
    const onMessage = (event: MessageEvent) => {
      if (event.source !== window.parent) return;
      const features = readWidgetHello(event.data, instanceId);
      if (!features) return;
      const next = { editRequest: features.includes('edit-request'), marksContext: features.includes('marks-context') };
      setSupport((prev) => (prev.editRequest === next.editRequest && prev.marksContext === next.marksContext ? prev : next));
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [instanceId]);
  return support;
}

/** True once the parent widget announced edit-request support for this instance. */
export function useWidgetAcceptsEdits(instanceId: string | undefined): boolean {
  return useWidgetSupport(instanceId).editRequest;
}

/** Fire-and-forget: the widget turns this into host model context. */
export function postMarks(message: MarksMessage): void {
  if (typeof window === 'undefined' || window.parent === window) return;
  window.parent.postMessage(message, '*');
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
