# Anthropic Connectors Directory

Submit at **claude.ai/directory/manage** → *MCP connector* (any paid Claude plan; on Team/Enterprise an Owner submits). Docs: https://claude.com/docs/connectors/building/submission, checklist: https://claude.com/docs/connectors/building/review-criteria. Submissions are scanned automatically and listed as **Community**. Anthropic may move a listing up to **Verified**.

The plugin bundle (`plugins/kernelcad`) is a separate submission. Submit the remote server as a connector even if the plugin already references it.

## Requirements checklist
- [x] Remote and HTTPS: `https://mcp.kernelcad.com/mcp`
- [x] No auth needed for public use; OAuth 2.0 with DCR for accounts
- [x] Every tool has a **`title`** and `readOnlyHint` / `destructiveHint`. Checked on the live server on 2026-10-16: all 73 tools carry titles and annotations.
- [x] Privacy policy: https://kernelcad.com/privacy
- [x] Public docs: https://kernelcad.com/docs/
- [ ] Every tool tested in MCP Inspector and as a custom connector in Claude (the *Test & launch* step asks you to confirm)
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
