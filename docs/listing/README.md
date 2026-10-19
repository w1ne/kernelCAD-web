# kernelCAD listing kit

Copy and metadata for listing kernelCAD in each directory. One file per directory. Facts that every listing shares are kept here, so each file can link back to them instead of repeating them.

| Directory | File | How you submit | Status |
|---|---|---|---|
| ChatGPT app / plugin directory | [chatgpt-directory.md](chatgpt-directory.md) | Plugin ZIP upload (Plugins → Upload new or existing plugin), after org verification | ZIP builds with `npm run listing:zip`; not listed |
| Anthropic Connectors Directory | [anthropic-connector-directory.md](anthropic-connector-directory.md) | Developer portal: claude.ai/directory/manage → MCP connector | protocol verification done 2026-10-19; not listed |
| Official MCP Registry | [mcp-registry.md](mcp-registry.md) + [server.json](server.json) | `mcp-publisher publish` | `server.json` is 0.17.0 and remote only; the npm entry returns once 0.17.0 is published (npm is at 0.15.0) |
| Grok Build built-in marketplace | [grok-marketplace.md](grok-marketplace.md) | PR to `xai-org/plugin-marketplace` | prepared; not listed |
| Cursor Marketplace | [cursor-marketplace.md](cursor-marketplace.md) | Dashboard → Plugins & MCPs; team import works, public listing needs submission | not listed |
| Smithery | [smithery.md](smithery.md) | smithery.ai/new with the server URL | not listed |
| mcp.so | [mcp-so.md](mcp-so.md) | mcp.so submit form | not listed |
| skills.sh | [skills-sh.md](skills-sh.md) | Public GitHub repo + `skills.sh.json` | grouping file exists |

Already listed: Glama (https://glama.ai/mcp/connectors/com.kernelcad/kernelcad) and mcpi (https://mcpi.app/servers/kernelcad).

## Positioning (use everywhere)

**Already in ChatGPT and Claude. No install.** kernelCAD is a hosted MCP server. You can connect it and design straight away, with nothing to download, no CAD licence and no local Python.

- **No account needed to try.** The hosted server takes anonymous calls. Signing in (OAuth) only adds saved projects and Studio share links.
- **Real CAD files.** Export STEP, STL, 3MF, GLB, OBJ, USD and DXF, plus engineering drawings as PDF or SVG with dimensions, hole callouts and a title block. You can also import your own STEP or STL.
- **In-chat 3D.** `open_in_studio` opens the model in an embedded 3D viewer in the chat (an MCP App on the hosted server), where you can review and mark it up without leaving the conversation.
- **Checks as you go.** Assemblies get interference and collision gates. Exported meshes are checked for watertightness. Manufacturing rules that a script declares with `dfmSpec` are enforced on every build. An on-demand DFM review covers FDM printing and CNC (overhangs, wall thickness, hole size, bridges, bed fit, undercuts, corner radius vs tool), and FEA is available too. Say that these checks flag likely problems. Never say that a build passing proves the part can be manufactured.
- **Editable source.** Each model is a plain `.kcad.ts` script on an OpenCASCADE B-rep kernel. It's parametric and diffable, not a frozen mesh.

### Taglines
- Short (≤ 60): `CAD in ChatGPT and Claude: STEP, STL, drawings, no install`
- Registry (≤ 100, counted): `CAD in ChatGPT and Claude: editable parts, STEP/STL/drawings, in-chat 3D, automatic checks.` (91 chars)
- One-liner: *Describe a part and get an editable CAD model, a STEP file and a drawing in the same chat. kernelCAD checks the design for you as it builds.*

### Shared facts
| Field | Value |
|---|---|
| Name | kernelCAD |
| MCP URL | `https://mcp.kernelcad.com/mcp` (streamable HTTP) |
| Auth | None needed to try; OAuth 2.0 with dynamic client registration (`/reg`) for saved work |
| Local option | `npx -y kernelcad mcp` (stdio) |
| Registry name | `com.kernelcad/kernelcad` (matches `mcpName` in package.json) |
| Repo | https://github.com/w1ne/kernelCAD-web (MIT) |
| Website | https://kernelcad.com/ |
| Privacy policy | https://kernelcad.com/privacy |
| Terms | https://kernelcad.com/terms |
| Docs | https://kernelcad.com/docs/ |
| Category | Design / Engineering / Developer tools |

## Claims to keep honest
- "DFM review", "fab pack with quote links" and "import STEP/STL in chat" ship with PRs #944 (`dfm_review`), #945 (`fab_pack`) and #946 (`import_step`). Don't publish those claims until the PRs are merged and deployed.
- G-code export needs a local OrcaSlicer install, so it isn't available on the hosted server. Leave G-code out of the hosted listing copy.
- Don't write "every build is verified" or "guaranteed printable". The DFM gate only runs on rules a script declares, and `dfm_review` is a heuristic review.
- Quote links (`fab_pack`) send people to the vendor's own upload page. The hosted server also has `order_part`, which creates a production request with a pay link, so don't claim that kernelCAD never orders. Decide the commerce declaration first.

## Blockers before submitting (status as of 2026-10-19)
- **Tool titles.** Done on the live server: all 73 tools carry a `title`, `annotations` and an output schema (re-verified 2026-10-19 with `npm run listing:verify-mcp`). This repo's contract fixture has no titles, because the hosted layer supplies them. Keep the two in step if the title source moves.
- **Root `server.json`.** Fixed: 0.17.0, remote only. The npm package entry returns when 0.17.0 is published; npm is still at 0.15.0 (checked 2026-10-19).
- **ChatGPT plugin manifest.** Built by `npm run listing:zip` (allowlisted layout, `dist/listing/kernelcad-chatgpt-plugin-<version>.zip`). Still missing: four screenshots and a demo recording URL, both captured in the ChatGPT app itself. See [chatgpt-directory.md](chatgpt-directory.md).
- **ChatGPT CSP.** Declared on the hosted viewer resource (`connectDomains`, `resourceDomains`, `frameDomains`). Confirm it in a live ChatGPT app session.
- **Test credentials.** Still open. Both directories ask for a fully set-up demo account; prepare one, even though anonymous use works.
- **Commerce declaration.** Decision needed before the ChatGPT upload. The hosted server has `order_part` (pay link, card hold, a person confirms the price before charging) and `price_part` (real maker prices), so `commerce: false` and the "no ordering" copy are wrong. Either declare `commerce: true` with a description of the pay-link flow, or explain in the review notes why the maker, not kernelCAD, is the seller. Set `chatgpt.commerce` (and `commerceDescription`) in `agent-plugin.config.json`, then run `node scripts/agentPlugin/buildManifests.mjs` and `npm run listing:zip`.
