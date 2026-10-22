// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/studio/rebuild/rebuildQueueInstance.ts
//
// The transports the Studio uses and the shared rebuild queue. The worker
// transport is the normal path: the mesh fetch, the JSON parse and the
// packing of the numeric arrays happen off the UI thread. The inline
// transport runs the very same handler on the main thread where a Worker is
// not available (jsdom, SSR, a browser without module workers) so the queue
// behaves identically in tests and in production.

import {
  createRebuildWorkerHandler,
  isRebuildWorkerResponse,
  type RebuildWorkerRequest,
  type RebuildWorkerResponse,
} from './rebuildProtocol';
import { RebuildQueue, type RebuildTransport } from './rebuildQueue';

function pageUrl(url: string): string {
  try {
    return new URL(url, globalThis.location?.href).href;
  } catch {
    return url;
  }
}

function latchOnCrash(transport: RebuildTransport): RebuildTransport {
  return {
    ...transport,
    listen: (onMessage, onCrash) => transport.listen(onMessage, (reason) => {
      workerUnavailable = true;
      onCrash(reason);
    }),
  };
}

/** The real worker: the rebuild runs off the UI thread. */
export function createWorkerTransport(): RebuildTransport {
  const worker = new Worker(new URL('./rebuild.worker.ts', import.meta.url), { type: 'module' });
  let onMessage: ((message: RebuildWorkerResponse) => void) | null = null;
  let onCrash: ((reason: string) => void) | null = null;

  worker.onmessage = (event: MessageEvent<unknown>) => {
    if (!isRebuildWorkerResponse(event.data)) return;
    onMessage?.(event.data);
  };
  worker.onerror = (event: ErrorEvent) => {
    onCrash?.(event.message || 'The rebuild worker failed.');
  };
  worker.onmessageerror = () => {
    onCrash?.('The rebuild worker sent a message that could not be read.');
  };

  return {
    post: (message: RebuildWorkerRequest) => {
      // A worker resolves relative URLs against its own script URL, not the
      // page; pin them to the page so they hit the same endpoint as before.
      worker.postMessage(message.type === 'fetch' ? { ...message, url: pageUrl(message.url) } : message);
    },
    listen: (listener: (message: RebuildWorkerResponse) => void, crash: (reason: string) => void) => {
      onMessage = listener;
      onCrash = crash;
    },
    dispose: () => {
      worker.terminate();
    },
  };
}

/**
 * The fallback: the same worker logic on this thread. The answers are
 * delivered asynchronously (queueMicrotask) so the caller cannot tell the
 * difference, and `fetch` is looked up when the request runs - not when the
 * transport is built - so a test that stubs it keeps working.
 */
export function createInlineTransport(fetchImpl?: typeof fetch): RebuildTransport {
  let onMessage: ((message: RebuildWorkerResponse) => void) | null = null;

  const handle = createRebuildWorkerHandler({
    fetchImpl: (url, init) => {
      const impl = fetchImpl ?? globalThis.fetch;
      if (typeof impl !== 'function') {
        return Promise.reject(new Error('fetch is not available in this environment.'));
      }
      return impl(url, init);
    },
    post: (message: RebuildWorkerResponse) => {
      queueMicrotask(() => {
        onMessage?.(message);
      });
    },
  });

  return {
    post: (message: RebuildWorkerRequest) => {
      handle(message);
    },
    listen: (listener: (message: RebuildWorkerResponse) => void) => {
      onMessage = listener;
    },
  };
}

/**
 * The document key of the model the Studio shows. Every rebuild of that
 * model - the mesh fetches and the kernel executions - shares it, so a newer
 * rebuild supersedes the older one instead of painting a stale result.
 */
export const STUDIO_MODEL_DOC = 'studio-model';

const modelDocs = new WeakMap<object, string>();
let nextModelDoc = 1;

/**
 * The document key of one open model. `owner` is the model's revision
 * counter (one per GeometryProvider), so a remounted Studio, whose revisions
 * start again at 1, never collides with the edit order of the previous one.
 */
export function studioModelDoc(owner: object): string {
  let doc = modelDocs.get(owner);
  if (!doc) {
    doc = `${STUDIO_MODEL_DOC}:${nextModelDoc++}`;
    modelDocs.set(owner, doc);
  }
  return doc;
}

/**
 * The queue the Studio uses. The worker is created with the first fetch job
 * and again after a crash; where no Worker exists the inline transport keeps
 * the queue working.
 */
/** Set once the module worker failed (blocked, 404, CSP, crashed): later
 *  rebuilds use the inline transport instead of retrying a broken Worker. */
let workerUnavailable = false;

export const rebuildQueue = new RebuildQueue({
  // Bounds network concurrency only; a long server build must not hold up an
  // unrelated stored-mesh read behind it.
  maxConcurrent: 4,
  createTransport: () => {
    if (typeof Worker !== 'undefined' && !workerUnavailable) {
      try {
        return latchOnCrash(createWorkerTransport());
      } catch {
        // A browser that refuses module workers still gets the inline path,
        // and later rebuilds stop retrying it.
        workerUnavailable = true;
      }
    }
    return createInlineTransport();
  },
});
