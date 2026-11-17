---
title: Report a Studio problem
summary: Send the current evaluate or export failure, a model-viewport screenshot, and an optional design.
date: 2026-11-17
kind: guide
---

When an evaluate or an export fails, Studio can prepare a problem report from
that failure. The report is a GitHub issue you review and submit yourself.
Studio does not upload the screenshot or the design.

## Open a report

On a failed evaluate, the status line and the editor error offer **Report
problem**. On a failed export, the export status offers the same action.
**Help → Report a problem** (and the command palette entry of that name) opens
a report for the latest failure that is still showing. A successful evaluate
or export does not offer the button.

The form is filled from the failure that is current when you open it: the
error text, the hint, diagnostic codes, the message and hint on each
diagnostic, a short log tail, the app version and commit, and a coarse browser
and operating system. Opening the form does not send anything.

## What is included

The screenshot is the model viewport only. It is downloaded as
`kernelcad-viewport.png` when you continue, and you attach it to the issue.

**Include the design** is unchecked. The design is downloaded as
`kernelcad-design.kcad.ts` only after you check that box. The issue text never
contains the design. Leave the box unchecked to keep the design on this computer.

Before the text is placed in the issue, Studio removes email addresses,
tokens and keys, secret assignments, the userinfo of any
`scheme://user:password@host` URL (the scheme and host stay), query
strings, and local paths, and it limits how much text is included. A value that does not look like a version, commit, or timestamp
is left out. Read the issue before you submit it. Nothing is sent until you
submit it on GitHub.
