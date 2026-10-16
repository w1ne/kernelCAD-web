# Smithery

Docs: https://smithery.ai/docs/build/publish

## Publish (remote URL)
1. Go to https://smithery.ai/new and enter `https://mcp.kernelcad.com/mcp`.
2. Or use the CLI: `smithery mcp publish "https://mcp.kernelcad.com/mcp" -n @kernelcad/kernelcad`
3. No config schema is needed, because anonymous calls work. Don't add an `apiKey` parameter.
4. If the scan fails, serve a static server card at `https://mcp.kernelcad.com/.well-known/mcp/server-card.json` (`serverInfo`, `authentication: { required: false }`, `tools`).

## Settings tab copy
**Display name:** kernelCAD

**Short description:** CAD in ChatGPT and Claude: STEP, STL, drawings, no install

**Description (markdown):**
```markdown
**Already in ChatGPT and Claude. No install, no account needed to try.**

kernelCAD is hosted parametric CAD for agents. Describe a part and get an editable
`.kcad.ts` model on an OpenCASCADE B-rep kernel, with rendered previews in the chat and a 3D view in Studio.

- **Formats:** STEP, STL, 3MF, GLB, DXF, PDF/SVG engineering drawings, BOM. Import your own STEP/STL.
- **Checks:** interference and watertight meshes; declared manufacturing rules, on-demand DFM review for FDM and CNC, optional FEA.
- **Fab handoff:** a fab pack zip plus links to JLC3DP, PCBWay, Xometry, SendCutSend and Craftcloud quote pages.

Remote: `https://mcp.kernelcad.com/mcp` · Local: `npx -y kernelcad mcp`
```
**Homepage:** https://kernelcad.com/ · **Repo:** https://github.com/w1ne/kernelCAD-web · **Icon:** brand square PNG

Optional verification: a `smithery-verification=` TXT record on kernelcad.com, plus the Smithery badge in README.md.
