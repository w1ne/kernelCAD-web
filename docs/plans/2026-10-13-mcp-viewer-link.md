# MCP live Studio viewer link

Scope: item 1 only. A full local MCP build returns a loopback Studio viewer URL; subsequent full builds update that URL's source and geometry. No selection, sharing, kernel changes, or UI layout changes.

Implementation plan (inline execution):
1. Add failing HTTP/session lifecycle tests for first build, stable URL, source/mesh replacement, SSE updates, invalid tokens, and cleanup. Add evaluate-script regression coverage for successful builds, dry runs, and failed builds.
2. Add a loopback viewer server holding the last built model and a stable opaque script/session id. Serve packaged existing Studio assets and existing source/session/mesh/SSE protocol. Publish only successfully built models; report provisioning failure separately from CAD diagnostics.
3. Package the existing Studio app for local MCP use with same-origin backend settings. Refresh Code tab source when the local viewer broadcasts a source update. Keep layout untouched.
4. Document viewer lifetime, dry-run/failure policy, and local versus hosted behavior. Capture and inspect a short local workflow demo with invocation and evidence.
5. Run relevant MCP tests, typecheck, lint, CLI and viewer builds; inspect diff; commit, push the current feature branch, and create the requested develop PR. Do not merge.
