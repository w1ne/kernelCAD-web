# MCP structured content validation

The stdio server returns object results in `structuredContent` alongside serialized
JSON text. The real MCP SDK regression discovers `lookup_api`'s output schema and
validates its response through linked in-memory transports during `callTool`.

Run: `npx vitest run tests/integration/mcp/stdioStructuredContent.test.ts`.
This verifies local SDK behavior; it does not claim deployment or hardware acceptance.
