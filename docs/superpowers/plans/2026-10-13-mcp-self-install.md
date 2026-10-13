# MCP self-install implementation plan

Goal: an agent asked “look at kernelcad.com and install the mcp” can discover supported setup and verify it. Packaged skills must match the npm package version.

Architecture: a static marketing-site llms.txt links the existing hosted connection flow and optional local CLI installer. HTML head discovery and robots.txt link it without a layout change. The CLI build stamps copied SKILL.md frontmatter from package.json, leaving source skills untouched.

- Add failing tests for discovery, host commands, and package skill generation/version changes.
- Add site/llms.txt, discovery links, and plain-text cache headers. Document the prompt and package skill provenance.
- Replace the CLI skill copy with a focused generator that recursively copies assets and stamps SKILL.md metadata.version, rebuilding the destination to avoid stale skills.
- Run focused MCP/CLI/skill tests, CLI build, real npm tarball checks, typecheck and lint.
- Verify the real SDK discovery call; include structuredContent for object tool responses so clients can validate the already-advertised output schema. Add a failing SDK roundtrip regression test first.
- Record and inspect a short MP4 of actual local discovery, sandbox install configuration, and packaged version verification. Label it local validation; do not imply deployment or hardware acceptance.
- Review diff; commit, push current feature branch and open a develop PR with “Do not merge without Andrii”. Do not deploy or merge. Verify live llms.txt after a later approved marketing deployment.

Chosen over new installer logic: existing host CLI and JSON installers already handle installation; adding another installer would duplicate them. Chosen over hand-written skill versions: build-time stamping follows every package bump automatically.
