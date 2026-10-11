// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
const DEFAULT_TIMEOUT_MS = 30_000;

interface RenderOptions {
  sitekey: string;
  appearance: 'interaction-only';
  callback: (token: string) => void;
  'error-callback': () => void;
  'timeout-callback': () => void;
}

/** The part of the Cloudflare Turnstile browser API used here. */
export interface TurnstileApi {
  render(container: HTMLElement, options: RenderOptions): string;
  remove(widgetId: string): void;
}

export type TurnstileLoader = () => Promise<TurnstileApi>;

let scriptPromise: Promise<TurnstileApi> | null = null;

/** Loads Cloudflare's script once, and only when a token is first needed. */
export const loadTurnstileScript: TurnstileLoader = () => {
  scriptPromise ??= new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => {
      const api = (window as unknown as { turnstile?: TurnstileApi }).turnstile;
      if (api) resolve(api);
      else reject(new Error('Turnstile did not initialise'));
    };
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error('Turnstile script failed to load'));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
};

export interface TurnstileOptions {
  loader?: TurnstileLoader;
  timeoutMs?: number;
}

/**
 * Gets a Turnstile token for a signed-out build. Returns undefined at once
 * when no site key is configured. Rejects when the script is blocked, the
 * widget errors, or nothing answers in time; the caller sends the request
 * without a token and lets the server decide.
 */
export async function getTurnstileToken(
  siteKey: string | undefined,
  { loader = loadTurnstileScript, timeoutMs = DEFAULT_TIMEOUT_MS }: TurnstileOptions = {},
): Promise<string | undefined> {
  if (!siteKey) return undefined;
  const api = await loader();
  const container = document.createElement('div');
  container.setAttribute('data-kc-turnstile', '');
  // Stays empty unless Cloudflare needs a click; then it shows in the corner.
  container.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:2147483000';
  document.body.appendChild(container);
  let widgetId = '';
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await new Promise<string>((resolve, reject) => {
      timer = setTimeout(() => reject(new Error('Turnstile timed out')), timeoutMs);
      widgetId = api.render(container, {
        sitekey: siteKey,
        appearance: 'interaction-only',
        callback: resolve,
        'error-callback': () => reject(new Error('Turnstile check failed')),
        'timeout-callback': () => reject(new Error('Turnstile check expired')),
      });
    });
  } finally {
    if (timer) clearTimeout(timer);
    if (widgetId) api.remove(widgetId);
    container.remove();
  }
}
