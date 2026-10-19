# Reviewer test account

Both directories require a **fully set-up demo account**, even though anonymous use works. Never put credentials in the plugin ZIP: the portal rejects `test_credentials` / `reviewer_instructions` in the package, and the Anthropic form has its own secure fields. Enter them only through the portal forms.

## Create the account

1. Use a dedicated mailbox that can receive verification and support mail, for example `reviewers@kernelcad.com` (or an alias that forwards to the maintainer). Add it to the team password manager with a strong generated password.
2. Sign in at `https://app.kernelcad.com/signin` and create the account with email + password (Google and GitHub also work; email + password is the one reviewers can use without a personal OAuth account).
3. Seed it so the first screen after signing in is not empty:
   - Run the starter prompt from `/connect` once (in ChatGPT, Claude, or the built-in agent at `/generate`): *"Design a wall bracket for a 30 mm round sensor…"*. It saves "Wall bracket for a 30 mm sensor" to the account's projects (`/me`).
   - Keep one project public with a render, so its `/p/<slug>` share link opens the 3D viewer and downloads without signing in. Note the slug for the review notes.
   - Optionally add one assembly project (for the interference-check story) and one drawing export.
4. Verify in a private window: sign-in works, `/me` lists both projects, the public share link opens, and an export download link (STEP or PDF) resolves.

## Enter it in the portals

| Portal | Where |
|---|---|
| ChatGPT submission | Review step → reviewer test account form (secure dashboard, not the ZIP) |
| Anthropic submission | claude.ai/directory/manage → MCP connector → *Test & launch* credentials |

State in the notes that the account is only needed for the signed-in parts (projects, share links); any tool works anonymously.

## Rotate

Change the password when a review cycle finishes, and keep the account's project list small and recognisable; reviewers see whatever is in it.
