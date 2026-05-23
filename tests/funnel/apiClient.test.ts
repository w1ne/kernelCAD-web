// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getSession = vi.fn();

vi.mock('../../src/funnel/lib/supabaseClient', () => ({
  getSupabase: () => ({
    auth: { getSession },
  }),
}));

import {
  authedFetch,
  createCheckoutSession,
  createMcpToken,
  fetchMyPlan,
  openBillingPortal,
  saveProject,
} from '../../src/funnel/lib/apiClient';

const ORIGINAL_FETCH = globalThis.fetch;

beforeEach(() => {
  vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com');
  getSession.mockResolvedValue({
    data: { session: { access_token: 'jwt-token-123' } },
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
  getSession.mockReset();
  globalThis.fetch = ORIGINAL_FETCH;
});

function mockFetchOnce(body: unknown, init: { status?: number; statusText?: string } = {}) {
  const fetchMock = vi.fn().mockResolvedValueOnce({
    ok: (init.status ?? 200) < 400,
    status: init.status ?? 200,
    statusText: init.statusText ?? 'OK',
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
    json: async () => body,
  });
  globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;
  return fetchMock;
}

describe('fetchMyPlan', () => {
  it('GETs the plan endpoint with auth header and parses the response', async () => {
    const fetchMock = mockFetchOnce({
      plan: 'free',
      generationsRemaining: 3,
      currentPeriodEnd: null,
    });
    const result = await fetchMyPlan();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.example.com/api/v1/me/plan');
    expect(init.method).toBe('GET');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer jwt-token-123');
    expect(result).toEqual({ plan: 'free', generationsRemaining: 3, currentPeriodEnd: null });
  });

  it('omits Authorization header when no session', async () => {
    getSession.mockResolvedValueOnce({ data: { session: null } });
    const fetchMock = mockFetchOnce({ plan: 'free', generationsRemaining: 5, currentPeriodEnd: null });
    await fetchMyPlan();
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it('throws on non-2xx with the response body in the message', async () => {
    mockFetchOnce('plan endpoint unavailable', { status: 503 });
    await expect(fetchMyPlan()).rejects.toThrow(/plan endpoint unavailable/);
  });
});

describe('createCheckoutSession', () => {
  it('POSTs to the create-checkout endpoint with auth and returns the URL', async () => {
    const fetchMock = mockFetchOnce({ url: 'https://checkout.stripe.com/c/cs_test_abc' });
    const result = await createCheckoutSession();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.example.com/api/v1/billing/create-checkout');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer jwt-token-123');
    expect(result.url).toBe('https://checkout.stripe.com/c/cs_test_abc');
  });

  it('throws on non-2xx', async () => {
    mockFetchOnce('billing unavailable', { status: 500 });
    await expect(createCheckoutSession()).rejects.toThrow(/billing unavailable/);
  });
});

describe('openBillingPortal', () => {
  it('POSTs to the portal endpoint with auth and returns the URL', async () => {
    const fetchMock = mockFetchOnce({ url: 'https://billing.stripe.com/p/session_xyz' });
    const result = await openBillingPortal();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.example.com/api/v1/billing/portal');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer jwt-token-123');
    expect(result.url).toBe('https://billing.stripe.com/p/session_xyz');
  });

  it('throws on non-2xx', async () => {
    mockFetchOnce('no portal session', { status: 400 });
    await expect(openBillingPortal()).rejects.toThrow(/no portal session/);
  });
});

describe('createMcpToken', () => {
  it('POSTs to the MCP token endpoint with auth and returns the token once', async () => {
    const fetchMock = mockFetchOnce({ token: 'kc_secret', tokenPrefix: 'kc_secret' });
    const result = await createMcpToken();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.example.com/api/v1/mcp/tokens');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer jwt-token-123');
    expect(result).toEqual({ token: 'kc_secret', tokenPrefix: 'kc_secret' });
  });
});

describe('saveProject', () => {
  it('sends public_unlisted as the default save privacy', async () => {
    const fetchMock = mockFetchOnce({ slug: 'saved-object', projectId: 'project-1' });

    await saveProject({
      generationId: 'gen-1',
      title: 'Saved object',
      code: 'return box(1, 1, 1);',
      parameters: [],
      privacy: 'public_unlisted',
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toMatchObject({
      privacy: 'public_unlisted',
    });
  });
});

describe('authedFetch', () => {
  it('serializes the body and forwards Authorization on POST', async () => {
    const fetchMock = mockFetchOnce({ ok: true });
    const result = await authedFetch<{ ok: boolean }>(
      'POST',
      '/api/v1/save',
      { hello: 'world' },
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.example.com/api/v1/save');
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ hello: 'world' }));
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer jwt-token-123');
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
    expect(result).toEqual({ ok: true });
  });

  it('omits Authorization and body when no session and no body provided', async () => {
    getSession.mockResolvedValueOnce({ data: { session: null } });
    const fetchMock = mockFetchOnce({ plan: 'free' });
    await authedFetch<unknown>('GET', '/api/v1/me/plan');

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe('GET');
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
    expect(init.body).toBeUndefined();
  });

  it('throws an Error containing the response body on non-2xx', async () => {
    mockFetchOnce('upstream exploded', { status: 500 });
    await expect(authedFetch('POST', '/api/v1/save', {})).rejects.toThrow(/upstream exploded/);
  });
});
