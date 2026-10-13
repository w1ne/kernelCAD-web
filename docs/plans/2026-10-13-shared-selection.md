# Shared Studio/MCP selection

Scope: two tools, get_selection and set_selection, addressing an explicit local Studio session. Reuse the viewer's face/edge click store and pooled session; no layout changes and no kernel changes. Selection contains the rendered shape index, topology kind/index and creating feature id (not a stable topology reference). Clear it on model rebuild. Hosted route integration belongs to the separate server repository and is not claimed here.

1. Write endpoint and transport tests; observe failures.
2. Add validated single-pick session state and GET/POST endpoint, mount in Vite.
3. Add MCP tools, annotations/output schemas and append registry contract.
4. Synchronize the viewer store bidirectionally with serialized polling and writes.
5. Update usage documentation, record local demonstration and verification.
6. Run relevant suites, typecheck and lint; review diff; commit, push feature branch and create PR.

Existing Studio already has a face/edge code-link selection store; reuse it rather than duplicate picking.
