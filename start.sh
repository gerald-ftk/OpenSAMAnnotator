#!/bin/bash
# CV Dataset Manager — delegates to run.py which manages both processes
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"
exec python3 run.py "${@:-start}"
