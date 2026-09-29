// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { getSupabase } from './supabaseClient';
import type { Artifact } from './generateClient';
import type { AdminStats, StatsWindow } from '../../studio/stats/types';

export interface GenerationRow {
  id: string;
  // 'gate_failed' is the live server status; 'eval_failed' kept for historical rows.
  status: 'running' | 'done' | 'gate_failed' | 'eval_failed' | 'llm_failed' | 'timeout';
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

/** A non-2xx answer from kernelCAD-server. `message` is the response body
 *  (unchanged from before); `status` lets a caller tell 403 from 5xx. */
export class ApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

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
    throw new ApiError(await res.text().catch(() => `HTTP ${res.status}`), res.status);
  }
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export type ProjectPrivacy = 'public_unlisted' | 'public_featured' | 'private';

export interface SaveProjectInput {
  generationId?: string;
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

/** Result of following an anonymous claim link (kernelCAD-server
 *  POST /api/v1/anon-claims). `moved` projects changed owner now;
 *  `alreadyOwned` were already in this account (the claim is idempotent). */
export interface AnonClaimResult {
  moved: number;
  alreadyOwned: number;
}

/** Move every project of the anonymous owner named in a claim link (the
 *  `t` token an MCP tool result links to) into the signed-in user's account. */
export async function claimAnonProjects(token: string): Promise<AnonClaimResult> {
  return authedFetch<AnonClaimResult>('POST', '/api/v1/anon-claims', { token });
}

export type AnonClaimErrorKind = 'expired' | 'invalid' | 'foreign' | 'unavailable' | 'failed';

/** Map a claimAnonProjects rejection (authedFetch puts the response body in
 *  the message) to what the user should be told. */
export function anonClaimErrorKind(err: unknown): AnonClaimErrorKind {
  const text = err instanceof Error ? err.message : String(err);
  if (text.includes('claim_token_expired')) return 'expired';
  if (text.includes('invalid_claim_token')) return 'invalid';
  if (text.includes('claimed_by_another_account')) return 'foreign';
  if (text.includes('claim_unavailable')) return 'unavailable';
  return 'failed';
}

/** POST a viewer-captured PNG (base64, no `data:` prefix) to the backend render
 *  endpoint. The hosted backend has no browser, so the user's open Studio tab
 *  captures its own WebGL canvas and uploads it here; an agent then fetches the
 *  stored image. Anonymous-capable: the slug is the capability (same pattern as
 *  claimProject). Returns the URL the agent can read the image from. */
export async function postProjectRender(slug: string, pngBase64: string): Promise<{ url: string }> {
  return authedFetch<{ ok: true; url: string }>(
    'POST',
    `/api/v1/projects/${encodeURIComponent(slug)}/render`,
    { png: pngBase64 },
  );
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

// ---------------------------------------------------------------------------
// Community gallery + remix (kernelCAD-server galleryRouter / cloneRouter).
//   GET   /api/v1/gallery?sort=&cursor=&limit=   -> GalleryPage (public)
//   GET   /api/v1/projects/:slug/gallery         -> ProjectGalleryState
//   PATCH /api/v1/projects/:slug/gallery         -> { listed, listedAt } (owner)
//   POST  /api/v1/projects/:slug/report          -> { ok }
//   POST  /api/v1/projects/:slug/clone           -> { slug, projectId }
// ---------------------------------------------------------------------------

export type GallerySort = 'new' | 'remixed' | 'featured';

export interface ProjectRef {
  slug: string;
  title: string;
}

export interface GalleryItem {
  slug: string;
  title: string;
  /** Owner display name; null when they have none (show "anonymous"). */
  ownerName: string | null;
  /** Short-lived signed URL of the card render; null if unavailable. */
  renderUrl: string | null;
  remixCount: number;
  featured: boolean;
  /** Source this project was remixed from, while that source is public. */
  forkedFrom: ProjectRef | null;
  listedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface GalleryPage {
  items: GalleryItem[];
  /** Pass back as `cursor` for the next page; null on the last page. */
  nextCursor: string | null;
}

export async function fetchGallery(
  sort: GallerySort,
  cursor?: string | null,
  limit?: number,
): Promise<GalleryPage> {
  const qs = new URLSearchParams({ sort });
  if (cursor) qs.set('cursor', cursor);
  if (limit !== undefined) qs.set('limit', String(limit));
  return authedFetch<GalleryPage>('GET', `/api/v1/gallery?${qs.toString()}`);
}

export interface ProjectGalleryState {
  /** The project currently appears in the gallery. */
  listed: boolean;
  listedAt: string | null;
  /** The signed-in caller owns the project. */
  isOwner: boolean;
  /** Owner-only: hidden from the gallery by moderation. */
  hidden: boolean;
  /** Owner-only: a render image exists, so the project can be published. */
  hasRender: boolean;
  remixCount: number;
  forkedFrom: ProjectRef | null;
}

export async function fetchProjectGalleryState(slug: string): Promise<ProjectGalleryState> {
  return authedFetch<ProjectGalleryState>('GET', `/api/v1/projects/${encodeURIComponent(slug)}/gallery`);
}

/** Error codes the publish call can fail with (in the thrown message body). */
export const GALLERY_RENDER_REQUIRED = 'render_required';
export const GALLERY_NOT_PUBLIC = 'not_public';
export const GALLERY_HIDDEN = 'hidden_by_moderation';

/** Owner-only publish/unpublish. Publishing needs a public project with a
 *  captured render; it fails with GALLERY_RENDER_REQUIRED / GALLERY_NOT_PUBLIC
 *  / GALLERY_HIDDEN otherwise. */
export async function setProjectGalleryListed(
  slug: string,
  listed: boolean,
): Promise<{ listed: boolean; listedAt: string | null }> {
  return authedFetch('PATCH', `/api/v1/projects/${encodeURIComponent(slug)}/gallery`, { listed });
}

/** Report a project for moderation. Works signed out; rate limited per IP. */
export async function reportProject(slug: string, reason: string): Promise<{ ok: true }> {
  return authedFetch('POST', `/api/v1/projects/${encodeURIComponent(slug)}/report`, { reason });
}

/** Remix: copy a readable project into a new project owned by the caller
 *  (signed in). The copy records its source, which credits it on /p/<slug>. */
export async function remixProject(slug: string): Promise<{ slug: string; projectId: string }> {
  return authedFetch('POST', `/api/v1/projects/${encodeURIComponent(slug)}/clone`, {});
}

// ---------------------------------------------------------------------------
// Server-side revision history (Supabase-backed, owner-or-slug auth).
//   GET  /api/v1/projects/:slug/revisions            -> { revisions: [...] }
//   POST /api/v1/projects/:slug/revisions/:v/restore -> { version }
// ---------------------------------------------------------------------------

export interface ProjectRevision {
  version: number;
  created_at: string;
}

/** Saved source captured for one project version. */
export interface ProjectRevisionBody {
  slug: string;
  version: number;
  code: string;
  parameters: Artifact['parameters'];
}

/**
 * Fetch an exact saved revision. Consumers that request a pinned revision must
 * treat a failed read as unavailable rather than use the live project row.
 */
export async function fetchProjectRevisionBySlug(
  slug: string,
  version: number,
): Promise<ProjectRevisionBody> {
  return authedFetch<ProjectRevisionBody>(
    'GET',
    `/api/v1/projects/${encodeURIComponent(slug)}/revisions/${version}`,
  );
}

/** Newest-first list of saved server revisions for a slug-backed project.
 *  Unwraps the `{ revisions: [...] }` envelope; returns `[]` when missing. */
export async function listProjectRevisions(slug: string): Promise<ProjectRevision[]> {
  const res = await authedFetch<{ revisions?: ProjectRevision[] }>(
    'GET',
    `/api/v1/projects/${encodeURIComponent(slug)}/revisions`,
  );
  return res.revisions ?? [];
}

/** Restore the project's code to a prior revision; returns the restored
 *  version. The displayed model is refreshed by the caller via
 *  fetchProjectBySlug. */
export async function restoreProjectRevision(
  slug: string,
  version: number,
): Promise<{ version: number }> {
  return authedFetch<{ version: number }>(
    'POST',
    `/api/v1/projects/${encodeURIComponent(slug)}/revisions/${version}/restore`,
    {},
  );
}

/** A project in the owner's list: the row without its code and parameters,
 *  which the list never shows (and which can be large). */
export type MyProjectRow = Omit<ProjectRow, 'current_code' | 'parameters'>;

/** The signed-in user's own projects, most recently updated first. Empty when
 *  signed out. The owner filter is required: the read policy also returns
 *  every public-by-link project of other users. */
export async function listMyProjects(opts: { limit?: number } = {}): Promise<MyProjectRow[]> {
  const supabase = getSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const ownerId = session?.user?.id;
  if (!ownerId) return [];
  let query = supabase
    .from('projects')
    .select('id, slug, title, privacy, featured_at, version, updated_at, owner_id')
    .eq('owner_id', ownerId)
    .order('updated_at', { ascending: false });
  if (opts.limit !== undefined) query = query.limit(opts.limit);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data as MyProjectRow[] | null) ?? [];
}

/** Longest project title; the server save path trims titles to the same length. */
export const PROJECT_TITLE_MAX = 80;

/** Owner-only rename (the projects owner-update policy). Returns the saved
 *  title and the new updated_at. */
export async function renameProject(
  id: string,
  title: string,
): Promise<Pick<ProjectRow, 'title' | 'updated_at'>> {
  const clean = title.trim().slice(0, PROJECT_TITLE_MAX);
  if (!clean) throw new Error('A project needs a name.');
  const { data, error } = await getSupabase()
    .from('projects')
    .update({ title: clean })
    .eq('id', id)
    .select('title, updated_at')
    .single();
  if (error) throw new Error(error.message);
  return data as Pick<ProjectRow, 'title' | 'updated_at'>;
}

/** Owner-only delete (the projects owner-delete policy). Revisions, gallery
 *  rows and generations of the project go with it. Throws when no row was
 *  deleted, so a missing permission does not look like success. */
export async function deleteProject(id: string): Promise<void> {
  const { data, error } = await getSupabase()
    .from('projects')
    .delete()
    .eq('id', id)
    .select('id');
  if (error) throw new Error(error.message);
  if (!data || (data as unknown[]).length === 0) throw new Error('Project not found or not yours.');
}

// ---------------------------------------------------------------------------
// Billing / plan
// ---------------------------------------------------------------------------

export type PlanTier = 'free' | 'pro';

/** The two paid plans. 'basic' = $19/mo (5M tokens), 'pro' = $39/mo (12M tokens). */
export type PaidTier = 'basic' | 'pro';

/** Billing cadence. 'yearly' = 2 months free vs monthly. */
export type BillingPeriod = 'monthly' | 'yearly';

export interface MyPlan {
  plan: PlanTier;
  /** Which paid plan, when plan === 'pro'; null on free. */
  tier?: PaidTier | null;
  /** Free plan only: builds left this month. Paid plans are token-metered. */
  generationsRemaining: number | null;
  /** Paid plans: monthly token budget usage. Null on free. */
  tokensUsed?: number | null;
  tokensBudget?: number | null;
  tokensRemaining?: number | null;
  currentPeriodEnd: string | null;
  /** True when the user has a Stripe customer, so the Customer Portal
   *  (invoices, receipts, card) can open, also after a cancellation when the
   *  plan is back to free. Absent on older API builds. */
  hasBillingAccount?: boolean;
  /** Raw Stripe subscription status ('active', 'past_due', ...). Absent on
   *  older API builds. */
  subscriptionStatus?: string | null;
  /** True when a renewal charge failed (`past_due` / `unpaid`). Absent on older
   *  API builds, which is read as false. */
  paymentFailed?: boolean;
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
 * the caller should redirect to (window.location.href = url). `tier` selects
 * the plan ($19 Basic by default; 'pro' for the $39 plan); `period`
 * selects monthly (default) or yearly (2 months free) billing. */
export async function createCheckoutSession(
  tier: PaidTier = 'basic',
  period: BillingPeriod = 'monthly',
): Promise<CheckoutSession> {
  return authedFetch<CheckoutSession>('POST', '/api/v1/billing/create-checkout', { tier, period });
}

/** POST /api/v1/billing/portal — returns a Stripe Customer Portal URL for a
 * signed-in user with a Stripe customer: manage / cancel the subscription,
 * update the card, or download past invoices. */
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

// ---------------------------------------------------------------------------
// Admin stats (/stats)
// ---------------------------------------------------------------------------

/** GET /api/v1/admin/stats — admin-only (403 for everyone else). */
export async function fetchAdminStats(window: StatsWindow): Promise<AdminStats> {
  return authedFetch<AdminStats>('GET', `/api/v1/admin/stats?window=${window}`);
}
