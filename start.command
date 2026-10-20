#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"
chmod +x "$DIR/run.sh"
"$DIR/run.sh"
