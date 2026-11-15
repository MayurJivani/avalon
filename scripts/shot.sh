#!/usr/bin/env bash
# Headless Chromium on the Jinx container needs extracted system libs (see ~/.cache/chromelibs).
L=$HOME/.cache/chromelibs
ulimit -c 0
export LD_LIBRARY_PATH=$L/usr/lib/x86_64-linux-gnu:$L/lib/x86_64-linux-gnu
export FONTCONFIG_FILE=$L/fonts.conf
cd "$(dirname "$0")/.." && exec node "${SCRIPT:-scripts/shot.mjs}" "$@"
