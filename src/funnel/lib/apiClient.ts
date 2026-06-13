// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { getSupabase } from './supabaseClient';
import type { Artifact } from './generateClient';

export interface GenerationRow {
  id: string;
  status: 'running' | 'done' | 'eval_failed' | 'llm_failed' | 'timeout';
  code: string | null;
  prompt: string;
  suggestions: string[];
  diagnostics: { message?: string } | null;
  anon_id: string | null;
  project_id: string | null;
  created_at: string;
}

export async function fetchGeneration(genId: string): Promise<GenerationRow | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('generations')
    .select('id, status, code, prompt, suggestions, diagnostics, anon_id, project_id, created_at')
    .eq('id', genId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as GenerationRow | null) ?? null;
}

// ---------------------------------------------------------------------------
// authedFetch — single source of truth for kernelCAD-server HTTP calls.
//
// Pattern collapsed:
//   1. resolve Supabase session (Authorization header is optional when no
//      session — Studio routes are reachable anon for some endpoints).
//   2. fetch VITE_API_BASE_URL + path with JSON content-type.
//   3. on non-2xx, throw an Error whose message is the response body (or
//      `HTTP <status>` fallback). Tests assert on the body text.
//   4. on success, parse + return JSON as T.
// ---------------------------------------------------------------------------

export async function authedFetch<T>(
  method: 'GET' | 'POST' | 'PATCH',
  path: string,
  body?: unknown,
): Promise<T> {
  const supabase = getSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const base = import.meta.env.VITE_API_BASE_URL;
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    throw new Error(await res.text().catch(() => `HTTP ${res.status}`));
  }
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export type ProjectPrivacy = 'public_unlisted' | 'public_featured' | 'private';

export interface SaveProjectInput {
  generationId: string;
  anonId?: string;
  title: string;
  code: string;
  parameters: Artifact['parameters'];
  privacy?: Extract<ProjectPrivacy, 'public_unlisted' | 'private'>;
}

export interface SaveProjectResult {
  slug: string;
  projectId: string;
}

export async function saveProject(input: SaveProjectInput): Promise<SaveProjectResult> {
  return authedFetch<SaveProjectResult>('POST', '/api/v1/save', input);
}

/** "Sign in to save": claim an anonymous (owner-less) project for the signed-in
 *  user. `claimed` is false if it was already owned. */
export async function claimProject(slug: string): Promise<{ claimed: boolean }> {
  return authedFetch<{ claimed: boolean }>('POST', `/api/v1/projects/${encodeURIComponent(slug)}/claim`, {});
}

/** "Clone to my projects": copy a public project into a new project owned by
 *  the signed-in user. Returns the new project's slug + id so the caller can
 *  navigate to it. */
export async function cloneProject(slug: string): Promise<{ slug: string; projectId: string }> {
  return authedFetch('POST', `/api/v1/projects/${encodeURIComponent(slug)}/clone`);
}

/** Thrown when a free user tries to make a project private — the body text
 *  authedFetch surfaces on a 403 carries this code. Lets the UI show an
 *  upgrade CTA instead of a generic failure. */
export const PRIVATE_REQUIRES_PAID = 'private_requires_paid_account';

/** Owner-only privacy toggle (public_unlisted <-> private). Making a project
 *  private is Pro-gated server-side; a 403 carrying PRIVATE_REQUIRES_PAID means
 *  the caller needs to upgrade. */
export async function setProjectPrivacy(
  slug: string,
  privacy: Extract<ProjectPrivacy, 'public_unlisted' | 'private'>,
): Promise<{ privacy: Extract<ProjectPrivacy, 'public_unlisted' | 'private'> }> {
  return authedFetch('PATCH', `/api/v1/projects/${encodeURIComponent(slug)}/privacy`, { privacy });
}

export interface ProjectRow {
  id: string;
  slug: string;
  title: string;
  privacy: ProjectPrivacy | 'public';
  featured_at?: string | null;
  current_code: string;
  parameters: Artifact['parameters'];
  version: number;
  updated_at: string;
  /** Null for anonymous (public-by-link) projects — claimable via claimProject. */
  owner_id: string | null;
}

export async function fetchProjectBySlug(slug: string): Promise<ProjectRow | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('projects')
    .select('id, slug, title, privacy, featured_at, current_code, parameters, version, updated_at, owner_id')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as ProjectRow | null) ?? null;
}

export async function listMyProjects(): Promise<ProjectRow[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('projects')
    .select('id, slug, title, privacy, featured_at, current_code, parameters, version, updated_at, owner_id')
    .order('updated_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data as ProjectRow[] | null) ?? [];
}

// ---------------------------------------------------------------------------
// Billing / plan
// ---------------------------------------------------------------------------

export type PlanTier = 'free' | 'pro';

export interface MyPlan {
  plan: PlanTier;
  generationsRemaining: number;
  currentPeriodEnd: string | null;
}

export interface CheckoutSession {
  url: string;
}

export interface BillingPortalSession {
  url: string;
}

/** Authed GET against the kernelCAD-server billing/plan endpoint. */
export async function fetchMyPlan(): Promise<MyPlan> {
  return authedFetch<MyPlan>('GET', '/api/v1/me/plan');
}

/** POST /api/v1/billing/create-checkout — returns a Stripe Checkout URL
 * the caller should redirect to (window.location.href = url). */
export async function createCheckoutSession(): Promise<CheckoutSession> {
  return authedFetch<CheckoutSession>('POST', '/api/v1/billing/create-checkout');
}

/** POST /api/v1/billing/portal — returns a Stripe Customer Portal URL
 * for the signed-in pro user to manage / cancel their subscription. */
export async function openBillingPortal(): Promise<BillingPortalSession> {
  return authedFetch<BillingPortalSession>('POST', '/api/v1/billing/portal');
}

// ---------------------------------------------------------------------------
// MCP tokens
// ---------------------------------------------------------------------------

export interface McpTokenResult {
  token: string;
  tokenPrefix: string;
}

/** POST /api/v1/mcp/tokens — creates a one-time-visible token for cloud MCP. */
export async function createMcpToken(): Promise<McpTokenResult> {
  return authedFetch<McpTokenResult>('POST', '/api/v1/mcp/tokens');
}
