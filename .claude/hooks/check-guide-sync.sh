#!/usr/bin/env bash
# Blocks git commit/push when guide content changed but brand-guide.md didn't.
# Bypass for pure code or style changes: start the command with GUIDE_SYNC_OK=1
input=$(cat)
cmd=$(printf '%s' "$input" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("tool_input",{}).get("command",""))' 2>/dev/null)
case "$cmd" in *"git commit"*|*"git push"*) ;; *) exit 0 ;; esac
case "$cmd" in *GUIDE_SYNC_OK=1*) exit 0 ;; esac
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
if [[ "$cmd" == *"git commit"* ]]; then
  if [[ "$cmd" == *" -a"* || "$cmd" == *"--all"* ]]; then files=$(git diff --name-only HEAD); else files=$(git diff --cached --name-only); fi
else
  git rev-parse --verify -q origin/main >/dev/null || exit 0
  files=$(git diff --name-only origin/main...HEAD)
fi
if printf '%s\n' "$files" | grep -qE '^(index\.html|assets/js/.*\.js)$' && ! printf '%s\n' "$files" | grep -qx 'brand-guide.md'; then
  echo "brand-guide.md isn't part of this change, but index.html or assets/js/ is. Update brand-guide.md to match (see CLAUDE.md). If this change has no guide content, rerun with GUIDE_SYNC_OK=1 at the start of the command and say why in the commit message." >&2
  exit 2
fi
exit 0
