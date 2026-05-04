#!/usr/bin/env bash
# scripts/setup-user-tracking.sh
#
# One-time provisioning of:
#   1. Cloudflare D1 database `kernelcad-subscribers` + schema migration
#   2. Cloudflare Web Analytics site for kernelcad.com (token returned)
#   3. Patches site/wrangler.toml + site/{index,thanks}.html with the
#      provisioned IDs/tokens.
#
# Run once locally:
#   bash scripts/setup-user-tracking.sh
#
# Requires:
#   - wrangler authenticated (run `npx wrangler login` once if needed)
#   - jq, curl
#
# Idempotent: re-runs detect existing D1 / Web Analytics sites and reuse them.

set -euo pipefail

D1_NAME="kernelcad-subscribers"
WEB_ANALYTICS_HOST="kernelcad.com"

cd "$(dirname "$0")/.."

# ─── 0. Sanity checks ─────────────────────────────────────────────────────────
command -v jq >/dev/null   || { echo "ERROR: jq is required (apt install jq / brew install jq)"; exit 1; }
command -v curl >/dev/null || { echo "ERROR: curl is required"; exit 1; }

if ! npx --no-install wrangler whoami >/dev/null 2>&1; then
  echo "ERROR: wrangler not authenticated. Run 'npx wrangler login' once and retry."
  exit 1
fi

ACCOUNT_ID=$(npx --no-install wrangler whoami --json 2>/dev/null | jq -r '.account_id // empty')
if [ -z "$ACCOUNT_ID" ]; then
  ACCOUNT_ID=$(npx --no-install wrangler whoami 2>/dev/null | grep -oE '[0-9a-f]{32}' | head -1)
fi
if [ -z "$ACCOUNT_ID" ]; then
  echo "ERROR: could not determine Cloudflare account ID. Set CLOUDFLARE_ACCOUNT_ID env var or re-run 'wrangler login'."
  exit 1
fi
echo "Cloudflare account: $ACCOUNT_ID"

API_TOKEN="${CLOUDFLARE_API_TOKEN:-}"
if [ -z "$API_TOKEN" ]; then
  echo "NOTE: \$CLOUDFLARE_API_TOKEN not set. Web Analytics provisioning will be skipped."
  echo "      To include it, generate a token at https://dash.cloudflare.com/profile/api-tokens"
  echo "      with 'Account.Account Analytics.Edit' permission, then re-run with:"
  echo "        CLOUDFLARE_API_TOKEN=<token> bash scripts/setup-user-tracking.sh"
fi

# ─── 1. D1 database (idempotent) ─────────────────────────────────────────────
echo
echo "=== D1 database ==="
existing=$(npx --no-install wrangler d1 list --json 2>/dev/null \
  | jq -r ".[] | select(.name == \"$D1_NAME\") | .uuid" || true)

if [ -n "$existing" ]; then
  echo "D1 database '$D1_NAME' already exists ($existing); reusing."
  DB_ID="$existing"
else
  echo "Creating D1 database '$D1_NAME'..."
  out=$(npx --no-install wrangler d1 create "$D1_NAME")
  echo "$out"
  DB_ID=$(echo "$out" | grep -oE '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' | head -1)
  if [ -z "$DB_ID" ]; then
    echo "ERROR: could not parse database_id from wrangler output"
    exit 1
  fi
fi
echo "DB_ID=$DB_ID"

# ─── 2. Schema migration ─────────────────────────────────────────────────────
echo
echo "=== Schema migration ==="
npx --no-install wrangler d1 execute "$D1_NAME" --remote --file=site/migrations/0001_subscribers.sql

# ─── 3. Web Analytics site (idempotent — only if API token available) ────────
WA_TOKEN=""
if [ -n "$API_TOKEN" ]; then
  echo
  echo "=== Web Analytics site ==="
  list_resp=$(curl -sf -H "Authorization: Bearer $API_TOKEN" \
    "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/rum/site_info/list?per_page=100" || echo '{}')
  existing_token=$(echo "$list_resp" | jq -r ".result.[]? | select(.host == \"$WEB_ANALYTICS_HOST\") | .site_token" | head -1 || echo "")

  if [ -n "$existing_token" ] && [ "$existing_token" != "null" ]; then
    echo "Web Analytics site for $WEB_ANALYTICS_HOST already exists; reusing token."
    WA_TOKEN="$existing_token"
  else
    echo "Creating Web Analytics site for $WEB_ANALYTICS_HOST..."
    create_resp=$(curl -sf -X POST \
      -H "Authorization: Bearer $API_TOKEN" \
      -H "Content-Type: application/json" \
      "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/rum/site_info" \
      -d "{\"host\":\"$WEB_ANALYTICS_HOST\",\"auto_install\":false}")
    WA_TOKEN=$(echo "$create_resp" | jq -r '.result.site_token // empty')
    if [ -z "$WA_TOKEN" ]; then
      echo "WARNING: Web Analytics provisioning failed. Response:"
      echo "$create_resp"
      echo "Continuing without Web Analytics — D1 setup is still complete."
    fi
  fi
fi

# ─── 4. Patch site files ─────────────────────────────────────────────────────
echo
echo "=== Patching site files ==="
sed -i.bak "s|REPLACE_WITH_D1_DATABASE_ID|$DB_ID|g" site/wrangler.toml && rm site/wrangler.toml.bak
echo "  site/wrangler.toml updated with database_id=$DB_ID"

if [ -n "$WA_TOKEN" ]; then
  for f in site/index.html site/thanks.html; do
    sed -i.bak "s|REPLACE_WITH_CF_WEB_ANALYTICS_TOKEN|$WA_TOKEN|g" "$f" && rm "$f.bak"
    echo "  $f updated with Web Analytics token"
  done
else
  echo "  Web Analytics token NOT set — placeholder remains. Re-run with CLOUDFLARE_API_TOKEN to populate."
fi

echo
echo "=== Setup complete ==="
echo "Next steps:"
echo "  1. Review changes:    git status && git diff"
echo "  2. Commit + push:     git add -A && git commit -m 'chore(user-tracking): provisioned D1 + Web Analytics' && git push"
echo "  3. Verify D1 schema:  npx wrangler d1 execute $D1_NAME --remote --command 'SELECT * FROM subscribers'"
