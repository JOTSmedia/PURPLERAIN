#!/bin/zsh
PROJECT_DIR="$(cd -- "$(dirname -- "$0")" && pwd)"
if ! command -v python3 >/dev/null 2>&1; then
  print "Python 3 is required for the local launcher. You can also play the hosted game at https://purple-rain-after-the-encore.fuzzyjackets.chatgpt.site/"
  read "?Press Return to close."
  exit 1
fi
exec python3 "$PROJECT_DIR/launch.py"
