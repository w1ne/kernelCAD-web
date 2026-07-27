# Project Asset Bundles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist KCAD source and complementary files as immutable project versions, evaluate them through a path-safe hosted filesystem, and publish the exact validated bundle to Studio and the gallery.

**Architecture:** KernelCAD Server stores attachment bytes in the existing Supabase storage service under SHA-256 content keys and records path-to-hash manifests on both projects and revisions. Hosted mesh operations materialize an authorized manifest into a temporary directory and invoke the existing `meshSource(source, fileName, params)` API. KernelCAD Web sends project identity with mesh requests, renders only root features, and replaces indefinite warm-up UI with bounded loading phases.

**Tech Stack:** TypeScript, Express, Supabase PostgreSQL/Storage, Vitest, React, kernelCAD OCCT session bridge.

---

## File structure

### kernelCAD-server

- `supabase/migrations/20260727000000_project_asset_bundles.sql` — asset manifests and immutable revision snapshots.
- `src/lib/projectAssets.ts` — validation, hashing, storage, authorization, and temporary materialization.
- `src/lib/projectAssets.test.ts` — storage/path/materialization unit tests.
- `src/lib/projectsRepo.ts` — persist and read manifests with project versions.
- `src/lib/projectsRepo.assets.test.ts` — repository manifest behavior.
- `src/mcpTools/openInStudio.ts` — attachment-aware MCP contract and atomic persistence.
- `src/mcpTools/openInStudio.test.ts` — attachment publication tests.
- `src/mcpTools/getProject.ts` — expose attachment metadata.
- `src/mcpTools/getProjectRevision.ts` — expose immutable revision manifests.
- `src/mcpTools/getModelMesh.ts` — materialize assets and mesh only root geometry.
- `src/mcpTools/getModelMesh.test.ts` — bundled STEP and root visibility tests.
- `src/routes/mesh.ts` — project-version mesh input and asset-aware cache key.
- `src/routes/mesh.test.ts` — hosted project mesh tests.

### kernelCAD-web

- `src/funnel/lib/apiClient.ts` — request project-version-backed meshes.
- `src/funnel/lib/apiClient.test.ts` — request contract tests.
- `src/studio/contexts/GeometryContext.tsx` — send project slug/version and consume root mesh records.
- `src/studio/contexts/GeometryContext.test.tsx` — project mesh and failure-state tests.
- `src/studio/StudioShell.tsx` — explicit bounded load phases and error UI.
- `src/studio/StudioShell.test.tsx` — no-indefinite-warm-up regression tests.
- `src/studio/components/viewer/entities/` — root-only visibility selection if not already centralized.

## Task 1: Database manifest snapshots

**Files:**
- Create: `kernelCAD-server/supabase/migrations/20260727000000_project_asset_bundles.sql`
- Test: `kernelCAD-server/tests/projectAssetBundlesMigration.test.ts`

- [ ] Write a failing migration test asserting:

```ts
expect(sql).toContain('asset_manifest jsonb');
expect(sql).toContain('project_revisions');
expect(sql).toMatch(/new\.asset_manifest/);
expect(sql).toMatch(/jsonb_typeof\(.*asset_manifest.*\).*object/s);
```

- [ ] Run:

```bash
npm test -- tests/projectAssetBundlesMigration.test.ts
```

Expected: FAIL because the migration does not exist.

- [ ] Add `projects.asset_manifest jsonb not null default '{}'` and
  `project_revisions.asset_manifest jsonb not null default '{}'`. Update
  `snapshot_project_revision()` so the project row, source, parameters, and
  manifest snapshot atomically:

```sql
insert into public.project_revisions
  (project_id, version, code, parameters, asset_manifest)
values
  (new.id, new.version, new.current_code,
   coalesce(new.parameters, '[]'::jsonb),
   coalesce(new.asset_manifest, '{}'::jsonb));
```

Add constraints requiring a JSON object and limiting encoded manifest length.

- [ ] Run the migration test and existing revision migration tests.

- [ ] Commit:

```bash
git add supabase/migrations/20260727000000_project_asset_bundles.sql tests/projectAssetBundlesMigration.test.ts
git commit -m "add immutable project asset manifests"
```

## Task 2: Shared asset storage and safe materialization

**Files:**
- Create: `kernelCAD-server/src/lib/projectAssets.ts`
- Create: `kernelCAD-server/src/lib/projectAssets.test.ts`

- [ ] Write failing tests for normalized relative paths, traversal/absolute-path
  rejection, SHA-256 deduplication, extension/signature validation, authorized
  blob reuse, and cleanup after temporary materialization.

Core contract:

```ts
export interface ProjectAttachmentInput {
  path: string;
  bytesBase64?: string;
  assetSha256?: string;
}

export interface ProjectAssetEntry {
  sha256: string;
  byteLength: number;
  mediaType: string;
  format: string;
}

export type ProjectAssetManifest = Record<string, ProjectAssetEntry>;

export async function persistProjectAttachments(
  ownerId: string | null,
  attachments: ProjectAttachmentInput[],
): Promise<ProjectAssetManifest>;

export async function withMaterializedProject<T>(
  source: string,
  manifest: ProjectAssetManifest,
  fn: (sourcePath: string) => Promise<T>,
): Promise<T>;
```

- [ ] Run:

```bash
npm test -- src/lib/projectAssets.test.ts
```

Expected: FAIL because the module does not exist.

- [ ] Implement:

  - path normalization with `path.posix.normalize`;
  - rejection of empty, absolute, `..`, NUL, and duplicate normalized paths;
  - incremental SHA-256;
  - one existing Supabase storage bucket named `project-assets`;
  - object key `sha256/<first-two>/<hash>`;
  - upload with `upsert: false`, accepting duplicate-object responses;
  - a temporary directory created with `mkdtemp`;
  - directory creation and read-only asset writes;
  - `model.kcad.ts` as the source path;
  - cleanup in `finally`.

- [ ] Run tests and commit:

```bash
git add src/lib/projectAssets.ts src/lib/projectAssets.test.ts
git commit -m "add project asset storage"
```

## Task 3: Attachment-aware project persistence

**Files:**
- Modify: `kernelCAD-server/src/lib/projectsRepo.ts`
- Create: `kernelCAD-server/src/lib/projectsRepo.assets.test.ts`
- Modify: `kernelCAD-server/src/mcpTools/openInStudio.ts`
- Modify: `kernelCAD-server/src/mcpTools/openInStudio.test.ts`
- Modify: `kernelCAD-server/src/mcp/toolSchemaOverrides.ts`

- [ ] Write failing tests showing that `open_in_studio` accepts:

```ts
attachments: [{
  path: '2.0u_blank_costar.stp',
  bytesBase64: Buffer.from(stepBytes).toString('base64'),
}]
```

and passes the resulting manifest into both create and update operations.
Also prove that a failed attachment upload does not activate a project version.

- [ ] Extend the MCP schema:

```ts
attachments: {
  type: 'array',
  maxItems: 32,
  items: {
    type: 'object',
    required: ['path'],
    properties: {
      path: { type: 'string', minLength: 1, maxLength: 240 },
      bytesBase64: { type: 'string' },
      assetSha256: { type: 'string', pattern: '^[a-f0-9]{64}$' },
    },
    oneOf: [
      { required: ['path', 'bytesBase64'] },
      { required: ['path', 'assetSha256'] },
    ],
  },
}
```

- [ ] Persist attachments before the project row update, then include
  `asset_manifest` in the same project mutation that triggers the immutable
  revision snapshot.

- [ ] Return attachment count and hashes from `open_in_studio` so callers can
  read-after-write verify the bundle.

- [ ] Run:

```bash
npm test -- src/mcpTools/openInStudio.test.ts src/lib/projectsRepo.assets.test.ts
```

- [ ] Commit:

```bash
git add src/lib/projectsRepo.ts src/lib/projectsRepo.assets.test.ts src/mcpTools/openInStudio.ts src/mcpTools/openInStudio.test.ts src/mcp/toolSchemaOverrides.ts
git commit -m "persist studio project attachments"
```

## Task 4: Hosted bundled evaluation

**Files:**
- Modify: `kernelCAD-server/src/mcpTools/getModelMesh.ts`
- Modify: `kernelCAD-server/src/mcpTools/getModelMesh.test.ts`
- Modify: `kernelCAD-server/src/routes/mesh.ts`
- Modify: `kernelCAD-server/src/routes/mesh.test.ts`

- [ ] Write failing tests with a KCAD source that imports
  `./2.0u_blank_costar.stp`. Assert the mesher receives a real temporary
  `model.kcad.ts` path and the sibling STEP exists during the call.

- [ ] Change mesh dependencies to:

```ts
meshSource: (
  source: string,
  fileName?: string,
  params?: Record<string, number | boolean>,
) => Promise<MeshResult>;
```

Wrap the call:

```ts
await withMaterializedProject(source, manifest, (fileName) =>
  deps.meshSource(source, fileName, params)
);
```

- [ ] Add `slug` and `version` as an alternative to raw `source` on
  `/__kernelcad/mesh`. Fetch the authorized immutable revision, materialize its
  manifest, and include the version plus manifest hashes in the cache key.

- [ ] Fail with HTTP 422 and `project.asset.missing` before acquiring the OCCT
  mutex when a literal relative import is absent.

- [ ] Run:

```bash
npm test -- src/mcpTools/getModelMesh.test.ts src/routes/mesh.test.ts
```

- [ ] Commit:

```bash
git add src/mcpTools/getModelMesh.ts src/mcpTools/getModelMesh.test.ts src/routes/mesh.ts src/routes/mesh.test.ts
git commit -m "evaluate bundled project assets"
```

## Task 5: Root-only visible geometry

**Files:**
- Modify: `kernelCAD-server/src/mcpTools/getModelMesh.ts`
- Modify: `kernelCAD-server/src/mcpTools/getModelMesh.test.ts`
- Modify: `kernelCAD-web/src/studio/contexts/GeometryContext.tsx`
- Test: nearest existing geometry-context test file

- [ ] Add a failing regression model containing a box, spherical cutter, and
  returned subtraction. Assert the response marks only the returned subtraction
  visible:

```ts
expect(result.features.filter((f) => f.visibleByDefault).map((f) => f.id))
  .toEqual(['boolean_1']);
```

- [ ] Preserve feature records from the bridge and derive root IDs from returned
  capture records. Add `visibleByDefault` without dropping construction meshes
  needed for inspection.

- [ ] Update Studio to add only `visibleByDefault !== false` meshes to the
  default scene. Feature-tree actions can still opt into hidden meshes.

- [ ] Run focused server and web tests, then commit in each repository.

## Task 6: Bounded project loading UI

**Files:**
- Modify: `kernelCAD-web/src/studio/StudioShell.tsx`
- Modify: `kernelCAD-web/src/studio/contexts/GeometryContext.tsx`
- Test: `kernelCAD-web/src/studio/StudioShell.test.tsx`

- [ ] Write failing fake-timer tests proving:

  - kernel initialization has its own label;
  - asset fetch and geometry evaluation have distinct labels;
  - any error replaces the spinner immediately;
  - no progress state survives its timeout;
  - retry restarts only the failed project-loading operation.

- [ ] Model load state as:

```ts
type ProjectLoadPhase =
  | { kind: 'idle' }
  | { kind: 'loading-project' }
  | { kind: 'fetching-assets' }
  | { kind: 'evaluating' }
  | { kind: 'preparing-viewer' }
  | { kind: 'ready' }
  | { kind: 'error'; code: string; message: string };
```

- [ ] Use an `AbortController` and a 15-second project-operation deadline.
  Kernel boot remains separate and reports boot failure rather than reusing
  project progress text.

- [ ] Run focused tests and commit.

## Task 7: End-to-end keycap publication

**Files:**
- Add server fixture: `kernelCAD-server/tests/fixtures/keycap/2.0u_blank_costar.stp`
- Add web/gallery source and preview metadata only after project publication.

- [ ] Apply the database migration and deploy KernelCAD Server.

- [ ] Call attachment-aware `open_in_studio` with:

  - the verified `2.0u_blank_costar_make_no_mistakes_concave.kcad.ts`;
  - `2.0u_blank_costar.stp` at the exact relative path;
  - title and `dishDepth` metadata.

- [ ] Verify:

  - `get_project_revision` returns the manifest;
  - `get_model_mesh` returns no failed feature IDs;
  - bounds are approximately `37 × 18 × 8 mm`;
  - the huge sphere is not visible by default;
  - the browser shows the actual engraved Costar keycap;
  - STEP/STL/3MF exports match the pinned project version.

- [ ] Publish the validated version as a gallery entry, build the gallery, and
  deploy KernelCAD Web.

## Task 8: Full verification, PRs, merge, and production smoke

- [ ] Run KernelCAD Server:

```bash
npm test
npm run build
```

- [ ] Run KernelCAD Web:

```bash
npm test -- src/studio site/scripts/build-gallery.test.ts
npm run typecheck
npm run site:build
```

- [ ] Push both branches and open PRs with root cause, migration, compatibility,
  and production verification evidence.

- [ ] Merge server first, apply migration, and deploy.

- [ ] Merge web second and deploy.

- [ ] Open the final gallery URL in a clean browser context and verify load time,
  visual fidelity, attachment-backed recompute, and downloads.

