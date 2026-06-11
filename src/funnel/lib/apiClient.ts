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
  method: 'GET' | 'POST',
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
  owner_id: string;
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
