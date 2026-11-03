#!/usr/bin/env bash
# Post-deploy smoke test. Checks /healthz and /version on a base URL.
# Usage: scripts/smoke-test.sh http://localhost:3000 [expected-version]
set -euo pipefail

BASE_URL="${1:?usage: smoke-test.sh <base-url> [expected-version]}"
EXPECTED_VERSION="${2:-}"
RETRIES="${RETRIES:-10}"

for ((i = 1; i <= RETRIES; i++)); do
  if curl -fsS "${BASE_URL}/healthz" >/dev/null; then
    break
  fi
  if ((i == RETRIES)); then
    echo "Health check failed after ${RETRIES} attempts" >&2
    exit 1
  fi
  sleep 3
done
echo "Health check passed"

if [[ -n "${EXPECTED_VERSION}" ]]; then
  actual="$(curl -fsS "${BASE_URL}/version")"
  if [[ "${actual}" != *"\"${EXPECTED_VERSION}\""* ]]; then
    echo "Version mismatch: expected ${EXPECTED_VERSION}, got ${actual}" >&2
    exit 1
  fi
  echo "Version ${EXPECTED_VERSION} confirmed"
fi
