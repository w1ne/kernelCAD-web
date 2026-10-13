# ChatGPT app / plugin directory

Submit in the OpenAI Platform Dashboard (Apps → new app → submit for review), after identity verification. You need the Owner role or `api.apps.write`. Guidelines: https://developers.openai.com/apps-sdk/app-submission-guidelines. Submission flow: https://developers.openai.com/apps-sdk/deploy/submission.

## Form fields

**App name:** kernelCAD

**Short description (subtitle):**
Design real CAD parts in chat: STEP, STL and drawings

**Long description:**
> kernelCAD brings parametric CAD into ChatGPT, with no install and no account needed to try.
>
> Describe a part, such as a bracket, an enclosure, a gear or a fixture, and kernelCAD builds an editable model on a real B-rep CAD kernel. The model renders in 3D right in the chat. You can rotate it, mark it up and ask for changes.
>
> Every build is checked automatically. kernelCAD catches interfering parts, open meshes and features that won't print or machine, and runs a manufacturability review for FDM printing and CNC.
>
> When it's ready, export STEP for other CAD tools, STL or 3MF for slicers, GLB for the web, DXF for laser cutting, and a dimensioned PDF drawing. Package everything into a fab pack with links to the quote pages of JLC3DP, PCBWay, Xometry, SendCutSend and Craftcloud.
>
> Already have a design? Attach your STEP or STL and keep building on it.

**Category:** Productivity → Design (or Developer tools)

**MCP server URL:** `https://mcp.kernelcad.com/mcp`

**Authentication:** OAuth (optional). Anonymous calls work, and signing in adds saved projects and share links. Give reviewers a demo login anyway.

**Privacy policy:** https://kernelcad.com/privacy · **Terms:** https://kernelcad.com/terms · **Website:** https://kernelcad.com/

## Test prompts and expected responses
| # | Prompt | Expected |
|---|---|---|
| 1 | "Design a 60 × 40 × 5 mm mounting plate with four M4 clearance holes 5 mm from the corners." | Model builds, the 3D view shows a plate with 4 holes, and the evaluate result is green. |
| 2 | "Is it printable on a Bambu A1 mini? Check it for CNC too." | A `dfm_review` checklist with pass/fail rows. The plate passes FDM, and CNC is flagged only if there are sharp internal corners. |
| 3 | "Give me a STEP file and a PDF drawing." | `export` STEP + `pdf-drawing`, with download links and dimensions on the drawing. |
| 4 | "Make it 3 mm thicker and add 2 mm fillets on the outer edges." | The model updates, and a diff shows the change. |
| 5 | (attach `bracket.step`) "Add a 10 mm hole through the middle of this." | `import_step` brings the file in as the base body, then the hole is added. |
| 6 | "Package it for ordering." | A `fab_pack` zip plus quote links. It's stated that nothing was ordered. |

## Screenshots to capture
1. Plate with holes in the in-chat 3D view.
2. DFM checklist result.
3. PDF drawing preview.
4. An imported STEP being edited.

## Positioning notes
Lead with **"no install"** and **"try without an account"**. Competing plugins in the directory, text-to-cad (cadgen) and SpeakCAD, either need a local `uvx` install or an account with credits.
