// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getSession = vi.fn();

vi.mock('../../src/funnel/lib/supabaseClient', () => ({
  getSupabase: () => ({
    auth: { getSession },
  }),
}));

import {
  createCheckoutSession,
  fetchMyPlan,
  openBillingPortal,
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
