# Local MCP viewer workflow

A full local `evaluate_script` build returns `viewerUrl`. Open it in the bundled headless player, then build again or use a source-edit tool such as `set_param`: the same process-session link auto-refreshes the geometry and build diagnostics.

The loopback URL expires when the MCP process exits. It is not a public sharing link. Dry runs and failed builds retain the last built model. Hosted MCP remains a pass-through to its existing gateway.

Local verification used actual stdio MCP calls and an existing Chrome tab: a width change from 20 to 40 updated the geometry behind the identical URL. No deployment or hardware acceptance is claimed.
