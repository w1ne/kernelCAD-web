# ChatGPT app / plugin directory

ChatGPT apps are now submitted as **plugins**: you upload a plugin ZIP, the portal checks it, and then you submit it for review (checked 2026-10-13, https://developers.openai.com/plugins/deploy/submission).

## Submission steps
1. **Build the ZIP** from `plugins/kernelcad/` (the Agent Plugins layout: root `plugin.json`, `mcp.json`, `skills/`, plus the icon and screenshot files under `assets/`). Leave out credentials and secrets. Lifecycle hooks and `apps` / `.app.json` references are not accepted. The allowlisted layout is built by `npm run listing:zip`, which writes `dist/listing/kernelcad-chatgpt-plugin-<version>.zip` (12 KB, 8 files as of 0.17.0; verified 2026-10-19).
2. **Upload:** platform.openai.com → **Plugins** → **Upload new or existing plugin**, pick the verified developer identity, then **Upload plugin**. You need to be an org Owner or have Apps Management Write, and the org must have completed individual or business verification.
3. **Metadata & Skills:** wait for the checks, then fix any issues in the package and upload a corrected ZIP. These fields are read-only in the portal.
4. **MCPs:** connect `https://mcp.kernelcad.com/mcp`, complete the domain challenge (serve the token as plain text at `https://kernelcad.com/.well-known/openai-apps-challenge` or on the MCP host), and let the tool scan finish. Auth settings come from `mcp.json`. The portal supports none, OAuth, or mixed anonymous/OAuth, so kernelCAD should declare mixed.
5. **Review details:** check the imported test cases and enter the reviewer test account here, never in the ZIP. Then go to **Submit for review**, complete the attestations, and choose **Publish** once approved.

After the plugin is published, MCP tool changes are picked up by the daily scan (or a manual **Rescan**). Changes to metadata or skills need a new ZIP.

## Portal re-import requirements (checked 2026-10-19)

The dashboard pins the existing kernelCAD app. The ZIP builder applies all of these from `agent-plugin.config.json`; the repo package keeps its portable form.

- **Package name:** must equal the app's package name (`chatgpt.dashboardPackageName`, currently `app-6a2fcd20e8008191b0c688ca1bc7abb5`), not `kernelcad`.
- **MCP URL:** must equal the app's configured URL (`chatgpt.dashboardMcpUrl`, `https://mcp.kernelcad.com/chatgpt/mcp`, the ChatGPT mount on the hosted server), not the general `/mcp`.
- **Icons:** `logo` and `composerIcon` need `./`-prefixed paths, and the files must ship in the ZIP (this clears "App icon required").
- **Review cases:** `review.test_cases` must be a `{ positive, negative }` object, and `tools_triggered` a comma-separated string. A flat array or array-valued `tools_triggered` is rejected during import.
- **Commerce:** `review.commerce` + `review.commerce_description`, not under `publication`.

With all of these, the 0.17.0 draft imports with **No findings** (2026-10-19).

## What `plugins/kernelcad/plugin.json` needs before upload
These fields are generated from `agent-plugin.config.json` and already present: the privacy and terms URLs, `logo` (`./assets/logo.png`, square 512×512) and `composerIcon` (`./assets/logo.svg`, square viewBox 84), `review.test_cases` (5 positive, 3 negative), `review.commerce` (declared true on 2026-10-19 with the external-checkout description), and `publication.release_notes`. Both icon paths use the required `./` prefix and the referenced files ship in the ZIP, which is what clears the portal's "App icon required" finding. Screenshots are captured (see below). Still missing:
- `review.demo_recording_url`: a video walkthrough the reviewers can open.

Capture both in the ChatGPT app itself (developer-mode connector or the published app), where the in-chat viewer and checklists appear, so the package matches what reviewers will see. Keep the exact screenshots and their prompts in `docs/listing/assets/chatgpt/` when they land, and add them to `plugins/kernelcad/assets/screenshots/` before `npm run listing:zip` so the ZIP carries them.

The hosted server itself is verified for the reviewers with `npm run listing:verify-mcp`: on 2026-10-19 it reported 73 tools with 73 titles and 73 annotation sets, and a `lookup_api` discovery response (35,151 chars). Re-run it on the day of the submission and paste the output into the review notes.

Use the copy below for the `interface` text fields. `shortDescription` must be 30 characters or fewer.

## Listing copy

**App name:** kernelCAD

**shortDescription (≤ 30):**
CAD parts, STEP and drawings

**Long description:**
> kernelCAD brings parametric CAD into ChatGPT, with no install and no account needed to try.
>
> Describe a part, such as a bracket, an enclosure, a gear or a fixture, and kernelCAD builds an editable model on a real B-rep CAD kernel. Opening a model with `open_in_studio` shows it in an interactive 3D viewer right in the chat. You can rotate it, mark it up and ask for changes.
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
| 1 | "Design a 60 × 40 × 5 mm mounting plate with four M4 clearance holes 5 mm from the corners." | Model builds, the 3D view shows a plate with 4 holes, and the evaluate result is green. |
| 2 | "Is it printable on a Bambu A1 mini? Check it for CNC too." | A `dfm_review` checklist with pass/fail rows. The plate passes FDM, and CNC is flagged only if there are sharp internal corners. |
| 3 | "Give me a STEP file and a PDF drawing." | `export` STEP + `pdf-drawing`, with download links and dimensions on the drawing. |
| 4 | "Make it 3 mm thicker and add 2 mm fillets on the outer edges." | The model updates, and a diff shows the change. |
| 5 | (attach `bracket.step`) "Add a 10 mm hole through the middle of this." | `import_step` brings the file in as the base body, then the hole is added. |
| 6 | "Package it for ordering." | A `fab_pack` zip plus quote links. It's stated that nothing was ordered. |

## Screenshots (captured 2026-10-19/20)
All four are in [`assets/chatgpt/`](assets/chatgpt/), with their prompts in the README there:
1. `01-plate-viewer.png` — plate with holes in the in-chat 3D view.
2. `02-dfm-checklist.png` — DFM/CNC result table.
3. `03-step-drawing.png` — STEP + PDF drawing reply.
4. `04-step-import.png` — an imported STEP edited with a Ø10 hole in the 3D viewer.

They are not yet inside the plugin ZIP; `interface.screenshots` is optional. Add them under `plugins/kernelcad/assets/screenshots/` only if the portal asks for them in the package.

## Demo recording (under 90 seconds, one take is fine)

Record in a ChatGPT session with kernelCAD enabled, 1280×720 or larger, cursor visible:

1. Paste the plate prompt from test case 1, let the model finish, and rotate the in-chat 3D view once.
2. Ask the DFM question from test case 2 and scroll the pass/fail checklist slowly.
3. Ask for "a STEP file and a PDF drawing" (test case 3) and open the PDF preview.
4. Ask for the thicker version with fillets (test case 4) and show the updated model.
5. End on the saved project in Studio, signed in, with the share link visible.

Host the MP4 somewhere public (the marketing site's `/demos/` path or a GitHub release asset both work) and put that URL in `review.demo_recording_url` via `agent-plugin.config.json` → `chatgpt.releaseNotes`-adjacent fields are generated, but the URL itself is entered in the portal review form. Keep the exact file and a caption with the prompts in `docs/listing/assets/chatgpt/`.

Negative (three required):
| # | Prompt | Expected |
|---|---|---|
| N1 | "Order 10 of these from JLC3DP and pay with my card." | Refuses to order or pay. Offers a fab pack and quote links that the user opens themselves. |
| N2 | "Import https://192.168.1.10/part.step." | `import_step` refuses the private host and asks for a public link or an attached file. |
| N3 | "Write my history essay." | Doesn't call any kernelCAD tools. |

## Positioning notes
Lead with **"no install"** and **"try without an account"**. Keep the public copy about what kernelCAD itself does. Dated, sourced comparisons with other tools belong in kernelCAD-private, not here.

## Current draft state (2026-10-19)

- Metadata & skills: **0.17.0 · Draft, No findings**; all four skills pass checks. The About copy, category, capabilities, URLs and icons imported from the rebuilt ZIP. The earlier "App icon required" and "skills-only" findings are gone.
- MCP: configured at `https://mcp.kernelcad.com/chatgpt/mcp`, domain verified, authorized. The daily scan had **5 unpublished tool updates pending further review** (`evaluate_script`, `review_cad`, `send_to_printer`, `inspect_nurbs`, `write_bom`); their previous published versions stay live. kernelCAD #1068 adds the missing parameter types those tools carried; after the next `vendor/kernelcad` bump + deploy, use **Rescan** (or **Request manual review** if the definitions are intentional).
- Review status: **Not submitted**. Before submitting: record the demo, enter its URL where the review form asks, and add the reviewer test account through the secure form (never the ZIP). The four screenshots are captured in `docs/listing/assets/chatgpt/`.
