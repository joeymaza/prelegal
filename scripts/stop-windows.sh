#!/usr/bin/env bash
set -euo pipefail
docker stop prelegal && docker rm prelegal
echo "Stopped."
