#!/usr/bin/env bash
# Poll Forgejo Actions tasks voor een branch tot de laatste run klaar is.
# Vervangt `gh run watch` in de release-skill nu we op Codeberg draaien.
#
# Usage: ./scripts/forgejo-run-watch.sh [branch]       # default: staging
#
# Exit-codes:
#   0  laatste run op de branch is success
#   1  laatste run is failure/cancelled/etc
#   2  API-error of geen run gevonden
#
# Vereist:
#   CODEBERG_TOKEN   PAT met `read:repository` scope (export in shell-env).
#   curl + jq in PATH.
#
# Poll-interval = 15s. Timeout = 20 min (ruim boven Playwright-suite + deploy).

set -euo pipefail

BRANCH="${1:-staging}"
REPO="${FORGEJO_REPO:-jelmerk/topoquiz}"
API_BASE="https://codeberg.org/api/v1/repos/${REPO}/actions/tasks"
TOKEN="${CODEBERG_TOKEN:?set CODEBERG_TOKEN env-var met read:repository scope}"

POLL_INTERVAL=15
TIMEOUT_SECONDS=1200
start_ts=$(date +%s)

printf 'Watching %s on branch %s — ctrl-c om te stoppen\n' "$REPO" "$BRANCH"

while :; do
  now=$(date +%s)
  if (( now - start_ts > TIMEOUT_SECONDS )); then
    echo "timeout na ${TIMEOUT_SECONDS}s zonder conclusion" >&2
    exit 2
  fi

  # `tasks?limit=1` geeft de nieuwste run over alle branches; filter client-side.
  # (Forgejo API heeft nog geen branch-query-param, dus we pakken de top-N en
  # nemen de eerste hit op de gevraagde branch.)
  payload=$(curl -sf -H "Authorization: token ${TOKEN}" \
    "${API_BASE}?limit=10") || {
      echo "curl failed — check token/netwerk" >&2
      exit 2
    }

  run=$(echo "$payload" | jq --arg br "$BRANCH" '
    .workflow_runs // []
    | map(select(.head_branch == $br))
    | .[0]
  ')

  if [[ "$run" == "null" || -z "$run" ]]; then
    echo "nog geen run op branch=$BRANCH — polling…"
    sleep "$POLL_INTERVAL"
    continue
  fi

  status=$(echo "$run" | jq -r '.status // "unknown"')
  conclusion=$(echo "$run" | jq -r '.conclusion // "null"')
  id=$(echo "$run" | jq -r '.id // "?"')

  printf '[%s] run=%s status=%s conclusion=%s\n' \
    "$(date +%H:%M:%S)" "$id" "$status" "$conclusion"

  if [[ "$status" == "completed" ]]; then
    if [[ "$conclusion" == "success" ]]; then
      exit 0
    else
      exit 1
    fi
  fi

  sleep "$POLL_INTERVAL"
done
