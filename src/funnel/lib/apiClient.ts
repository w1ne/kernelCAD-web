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

export interface SaveProjectInput {
  generationId: string;
  anonId?: string;
  title: string;
  code: string;
  parameters: Artifact['parameters'];
}

export interface SaveProjectResult {
  slug: string;
  projectId: string;
}

export async function saveProject(input: SaveProjectInput): Promise<SaveProjectResult> {
  const supabase = getSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const base = import.meta.env.VITE_API_BASE_URL;
  const res = await fetch(`${base}/api/v1/save`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    throw new Error(await res.text().catch(() => `HTTP ${res.status}`));
  }
  return res.json();
}

export interface ProjectRow {
  id: string;
  slug: string;
  title: string;
  privacy: 'public' | 'private';
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
    .select('id, slug, title, privacy, current_code, parameters, version, updated_at, owner_id')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as ProjectRow | null) ?? null;
}

export async function listMyProjects(): Promise<ProjectRow[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('projects')
    .select('id, slug, title, privacy, current_code, parameters, version, updated_at, owner_id')
    .order('updated_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data as ProjectRow[] | null) ?? [];
}
