# ChatGPT app / plugin directory

ChatGPT apps are now submitted as **plugins**: you upload a plugin ZIP, the portal checks it, and then you submit it for review (checked 2026-10-13, https://developers.openai.com/plugins/deploy/submission).

## Submission steps
1. **Build the ZIP** from `plugins/kernelcad/` (the Agent Plugins layout: root `plugin.json`, `mcp.json`, `skills/`, plus the icon and screenshot files under `assets/`). Leave out credentials and secrets. Lifecycle hooks and `apps` / `.app.json` references are not accepted.
2. **Upload:** platform.openai.com → **Plugins** → **Upload new or existing plugin**, pick the verified developer identity, then **Upload plugin**. You need to be an org Owner or have Apps Management Write, and the org must have completed individual or business verification.
3. **Metadata & Skills:** wait for the checks, then fix any issues in the package and upload a corrected ZIP. These fields are read-only in the portal.
4. **MCPs:** connect `https://mcp.kernelcad.com/mcp`, complete the domain challenge (serve the token as plain text at `https://kernelcad.com/.well-known/openai-apps-challenge` or on the MCP host), and let the tool scan finish. Auth settings come from `mcp.json`. The portal supports none, OAuth, or mixed anonymous/OAuth, so kernelCAD should declare mixed.
5. **Review details:** check the imported test cases and enter the reviewer test account here, never in the ZIP. Then go to **Submit for review**, complete the attestations, and choose **Publish** once approved.

After the plugin is published, MCP tool changes are picked up by the daily scan (or a manual **Rescan**). Changes to metadata or skills need a new ZIP.

## What `plugins/kernelcad/plugin.json` needs before upload
These fields are generated from `agent-plugin.config.json` and already present: the privacy and terms URLs, `logo` and `composerIcon` (`assets/logo.svg`), `review.test_cases` (5 positive, 3 negative), `review.commerce: false` with a `commerce_description`, and `publication.release_notes`. Still missing:
- `interface.screenshots`: optional; see the list below.
- `review.demo_recording_url`: a video walkthrough the reviewers can open.

Use the copy below for the `interface` text fields. `shortDescription` must be 30 characters or fewer.

## Listing copy

**App name:** kernelCAD

**shortDescription (≤ 30):**
CAD parts, STEP and drawings

**Long description:**
> kernelCAD brings parametric CAD into ChatGPT, with no install and no account needed to try.
>
> Describe a part, such as a bracket, an enclosure, a gear or a fixture, and kernelCAD builds an editable model on a real B-rep CAD kernel. Each build returns rendered previews in the chat, and `open_in_studio` opens the model in the Studio 3D viewer, where you can rotate it and mark it up.
>
> kernelCAD checks as it goes. Assemblies are checked for interfering parts, exported meshes are checked for watertightness, and a script can declare its own manufacturing rules (minimum wall, hole size), which are then checked on every build. You can ask for a printability review for FDM or a machinability review for CNC at any time. These reviews flag likely problems; they are not a guarantee that a shop will accept the part.
>
> When it's ready, export STEP for other CAD tools, STL or 3MF for slicers, GLB for the web, DXF for laser cutting, and a dimensioned PDF drawing. Package everything into a fab pack with links to the quote pages of JLC3DP, PCBWay, Xometry, SendCutSend and Craftcloud.
>
> Already have a design? Attach your STEP or STL and keep building on it.

**Category:** Productivity → Design (or Developer tools)

**MCP server (in `mcp.json`):** `https://mcp.kernelcad.com/mcp`

**Authentication:** OAuth (optional). Anonymous calls work, and signing in adds saved projects and share links. Give reviewers a demo login anyway.

**Privacy policy:** https://kernelcad.com/privacy · **Terms:** https://kernelcad.com/terms · **Website:** https://kernelcad.com/

## Review test cases (`review.test_cases`)
Positive: use five of the six rows below. Row 6 needs a hosted fab_pack; if you leave it out, rows 1-5 are the five.
| # | Prompt | Expected |
|---|---|---|
| 1 | "Design a 60 × 40 × 5 mm mounting plate with four M4 clearance holes 5 mm from the corners." | Model builds, the rendered preview shows a plate with 4 holes, and the evaluate result is green. |
| 2 | "Is it printable on a Bambu A1 mini? Check it for CNC too." | A `dfm_review` checklist with pass/fail rows. The plate passes FDM, and CNC is flagged only if there are sharp internal corners. |
| 3 | "Give me a STEP file and a PDF drawing." | `export` STEP + `pdf-drawing`, with download links and dimensions on the drawing. |
| 4 | "Make it 3 mm thicker and add 2 mm fillets on the outer edges." | The model updates, and a diff shows the change. |
| 5 | (attach `bracket.step`) "Add a 10 mm hole through the middle of this." | `import_step` brings the file in as the base body, then the hole is added. |
| 6 | "Package it for ordering." | A `fab_pack` zip plus quote links. It's stated that nothing was ordered. |

## Screenshots to capture
1. Plate with holes: the rendered preview in the chat, and the Studio link.
2. DFM checklist result.
3. PDF drawing preview.
4. An imported STEP being edited.

Negative (three required):
| # | Prompt | Expected |
|---|---|---|
| N1 | "Order 10 of these from JLC3DP and pay with my card." | Refuses to order or pay. Offers a fab pack and quote links that the user opens themselves. |
| N2 | "Import https://192.168.1.10/part.step." | `import_step` refuses the private host and asks for a public link or an attached file. |
| N3 | "Write my history essay." | Doesn't call any kernelCAD tools. |

## Positioning notes
Lead with **"no install"** and **"try without an account"**. Keep the public copy about what kernelCAD itself does. Dated, sourced comparisons with other tools belong in kernelCAD-private, not here.
