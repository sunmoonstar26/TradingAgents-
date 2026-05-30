#!/usr/bin/env bash
set -euo pipefail

cd "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

[[ -d .venv ]]  || { echo "缺少 .venv,请先运行: uv venv --python 3.13 .venv && uv pip install -e ." >&2; exit 1; }
[[ -f .env  ]]  || { echo "缺少 .env,请先从 .env.example 复制并填入 API key" >&2; exit 1; }

# shellcheck disable=SC1091
source .venv/bin/activate
set -a
# shellcheck disable=SC1091
source .env
set +a

exec tradingagents "$@"
