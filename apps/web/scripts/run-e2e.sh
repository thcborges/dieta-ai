#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../../.." && pwd)"

docker run --rm --network host \
  -v "${ROOT_DIR}:/work" \
  -w /work/apps/web \
  mcr.microsoft.com/playwright:v1.51.0-noble \
  bash ./node_modules/.bin/playwright test "$@"
