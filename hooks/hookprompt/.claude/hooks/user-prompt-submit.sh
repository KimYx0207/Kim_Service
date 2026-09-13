#!/usr/bin/env bash
# macOS/Linux compatibility entrypoint. All filtering, context generation, and
# opt-in metadata-only debug handling live in the JavaScript implementation so
# this adapter cannot drift into a second privacy policy.

set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)" || {
    printf '{}'
    exit 0
}
HOOK_SCRIPT="$SCRIPT_DIR/user-prompt-submit.js"

if [ "$#" -gt 0 ]; then
    printf '%s' "$*" | node "$HOOK_SCRIPT"
else
    node "$HOOK_SCRIPT"
fi
