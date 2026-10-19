# Cursor Marketplace

Submit at Cursor's **Dashboard → Plugins & MCPs** (dashboard.cursor.com; checked 2026-10-19 against the flow documented in [agent-plugin-install.md](../usage/agent-plugin-install.md)). Two paths already work without a listing:

- **One-click MCP deeplink:** `cursor://anysphere.cursor-deeplink/mcp/install?name=kernelcad&config=eyJ1cmwiOiJodHRwczovL21jcC5rZXJuZWxjYWQuY29tL21jcCJ9`
- **Team import:** teams can import `w1ne/kernelCAD-web` under Dashboard → Plugins & MCPs → Team Marketplaces. Cursor reads `.cursor-plugin/plugin.json` from `plugins/kernelcad/`.

A public listing needs the marketplace submission form. Cursor also loads the Claude Code plugin, so users with that installed need nothing.

## Listing copy

**Name:** kernelCAD

**Short description:** CAD parts, STEP and drawings, no install.

**Long description:**
> Describe a part and kernelCAD builds it on a real B-rep CAD kernel: an editable `.kcad.ts` model with feature history, not a frozen mesh. Opening it in Studio shows an interactive 3D viewer you can rotate and mark up, then ask the agent for changes.
>
> kernelCAD checks as it goes. Assemblies are checked for interfering parts, exported meshes for watertightness, and a script can declare manufacturing rules (minimum wall, hole size) that are enforced on every build. Ask for a printability review for FDM or a machinability review for CNC at any time; these flag likely problems, they do not guarantee a shop will accept the part.
>
> Export STEP, STL, 3MF, GLB, OBJ and DXF, plus dimensioned PDF or SVG drawings, or import your own STEP/STL and keep building. The hosted MCP server takes anonymous calls, so the MCP-only deeplink works before any sign-in; signing in adds saved projects and Studio share links.

**Category:** Design / Engineering

**MCP server:** `https://mcp.kernelcad.com/mcp` (streamable HTTP; mixed anonymous/OAuth)

**Repository:** https://github.com/w1ne/kernelCAD-web (MIT)

**Homepage:** https://kernelcad.com

**Support:** https://github.com/w1ne/kernelCAD-web/issues/new

## Before submitting
- Confirm the deeplink still installs on the current Cursor release.
- Attach the same screenshots captured for the ChatGPT submission (see [chatgpt-directory.md](chatgpt-directory.md)); the Studio viewer and drawing exports are the strong ones.
- Use the shared taglines and facts from [README.md](README.md); keep claims to what the live server shows.
