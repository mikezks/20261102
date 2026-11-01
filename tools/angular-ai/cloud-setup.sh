#!/usr/bin/env bash
set -euo pipefail
angular_workspace="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$angular_workspace"
export NPM_CONFIG_CACHE="${NPM_CONFIG_CACHE:-/tmp/angular-ai-npm-cache}"
node tools/angular-ai/setup.mjs
