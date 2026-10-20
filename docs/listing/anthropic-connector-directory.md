# Anthropic Connectors Directory

Submit at **claude.ai/directory/manage** → *MCP connector* (any paid Claude plan; on Team/Enterprise an Owner submits). Docs: https://claude.com/docs/connectors/building/submission, checklist: https://claude.com/docs/connectors/building/review-criteria. Submissions are scanned automatically and listed as **Community**. Anthropic may move a listing up to **Verified**.

The plugin bundle (`plugins/kernelcad`) is a separate submission. Submit the remote server as a connector even if the plugin already references it.

## Requirements checklist
- [x] Remote and HTTPS: `https://mcp.kernelcad.com/mcp`
- [x] No auth needed for public use; OAuth 2.0 with DCR for accounts
- [x] Every tool has a **`title`** and `readOnlyHint` / `destructiveHint`. Checked on the live server on 2026-10-16: all 73 tools carry titles and annotations.
- [x] Privacy policy: https://kernelcad.com/privacy
- [x] Public docs: https://kernelcad.com/docs/
- [x] Protocol-level review of the live server: `npm run listing:verify-mcp` on 2026-10-19 connected anonymously, listed 73 tools (73 with titles, 73 with annotations) and returned the documented `lookup_api` discovery response (35,151 chars). MCP Inspector CLI (`npx @modelcontextprotocol/inspector --cli https://mcp.kernelcad.com/mcp --method tools/list`) on the same day: tools/list clean, schema portability 0 errors / 16 warnings across 10 tools. The Claude custom-connector *Test & launch* pass still needs a signed-in browser session.
- [ ] Test credentials for a fully set-up account
- [x] Square PNG icon: `plugins/kernelcad/assets/logo.png` (512×512). Support contact: the GitHub issues page.
- [ ] Allowed link URIs: kernelcad.com, plus the quote-service origins used by `fab_pack` (jlc3dp.com, jlccnc.com, pcbway.com, xometry.com, app.sendcutsend.com, craftcloud3d.com), if the widget opens links

## Listing copy

**Name:** kernelCAD

**Tagline:** CAD in Claude: STEP, STL and drawings, no install

**Description:**
> Design real, editable CAD parts by describing them. kernelCAD builds parametric models on an OpenCASCADE B-rep kernel and shows them in 3D in the conversation. It checks assemblies for interference and exported meshes for watertightness, enforces any manufacturing rules a script declares, and reviews printability (FDM) and machinability (CNC) when you ask. Export STEP, STL, 3MF, GLB, DXF and dimensioned PDF drawings, or bring in your own STEP/STL file to build on. No install and no account needed to try. Sign in to save projects and share them in Studio.

**Example prompts:**
- "Design a wall bracket for a 25 mm pipe, 4 mm thick, two M5 screw holes."
- "Check this part for 3D printing and for CNC with a 6 mm end mill."
- "Export a STEP and a PDF drawing with dimensions."
- "Here's a link to my STEP file. Cut a 20 × 10 mm slot in the top face."

## Submission progress (2026-10-19)

The MCP connector draft is filled through step 8 of 10 in `claude.ai/directory/manage`:

- **Connection:** `https://mcp.kernelcad.com/mcp` as a custom connector. The live read reported 76 tools and 2 resources, OAuth detected, connector added with "sign in when needed".
- **Tools:** the linter flagged 5 tools for missing parameter `type`s — `inspect` (edges, faces), `query` (query), `verify` (edges, faces, pose), `add_mate` (pose), `run_fea` (material, fixed). Fixed in kernelCAD #1068; the hosted server gets the fix after the next `vendor/kernelcad` bump + deploy, then reconnect/rescan. 3 suggestions also shown.
- **Listing:** name, slug `kernelcad`, tagline, description, categories (Productivity, Development tools, Creative), author, docs, support (GitHub issues), privacy.
- **Use cases:** design a part, check manufacturing, export STEP/PDF, with the example prompts above.
- **Company:** kernelCAD, https://kernelcad.com, contact prefilled from the Claude account, role Maintainer.
- **Authentication:** Required when the server asks + Dynamic Client Registration (matches the mixed anonymous/OAuth server).
- **Data handling:** we own the API; no personal health data; no sponsored content.
- **Test setup instructions:** anonymous access documented, OAuth endpoints listed, reviewer credentials to come through the secure channel.

Still open before submitting:

- **Tool schema types** (the 5 tools above) and the **self-tested** attestation, which requires running every tool via MCP Inspector/Claude.
- **Reviewer test credentials** (see [reviewer-test-account.md](reviewer-test-account.md)).
- **Compliance attestation review.** One required statement says tool descriptions must contain no instructions about model behavior, other tools, or external instruction sources. Many kernelCAD descriptions carry usage guidance ("prefer `open_in_studio`", "do not fan out parallel lookups", "never ask the user to rotate"). Decide whether to soften the descriptions or explain them as tool-usage guidance; do not tick the box without that review.
- **Step 10 submit** requires the owner's attestations.

## Draft state (2026-10-20)

The connector draft is filled through **step 8 of 10** and resumes at that step at `claude.ai/directory/manage/new/connector` (the Submissions list shows only submitted entries, not drafts).

- Connection: kernelCAD selected and connected, 76 tools / 2 resources, OAuth.
- Tools: **0 to fix**, 3 suggestions (5 missing parameter types fixed in kernelCAD #1068 and deployed).
- Listing, use cases, company, authentication (deferred sign-in + DCR), data handling, and test instructions are filled.
- Remaining: reviewer credentials, the self-tested attestation (every tool via MCP Inspector/Claude), the compliance statement about tool-description instructions, and submit.

### Connector picker caveat

The "choose a connector you've already added" list can omit kernelCAD even when the URL exists in the organization. The reliable path is: remove the connector in Customize → Connectors → Yours, then add it through the submission form's **Add custom connector** flow (Step 1 → Step 2: "Sign in when needed" → Add), back out of the kernelCAD OAuth page, and continue; the form then shows **Connected · 76 Tools**.

### Plugin bundle route

The separate plugin-bundle submission (Step 1 of 5, repository) rejects this monorepo: "Repository too large to download" (validation cap: 50 MiB compressed / 256 MiB uncompressed). Submitting the bundle needs a small mirror repo with `plugins/kernelcad` at its root (or the plugin folder moved to one). The connector listing does not have this limit.
