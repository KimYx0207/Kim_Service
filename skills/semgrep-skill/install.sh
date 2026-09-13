#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"

if command -v python3 >/dev/null 2>&1; then
  PYTHON=python3
elif command -v python >/dev/null 2>&1; then
  PYTHON=python
else
  echo "Python 3 is required. This installer never installs Python or Semgrep automatically." >&2
  exit 1
fi

exec "$PYTHON" "$SCRIPT_DIR/scripts/install.py" "$@"
