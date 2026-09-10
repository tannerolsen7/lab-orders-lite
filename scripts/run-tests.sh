#!/usr/bin/env bash
set -euo pipefail

# Runs the project test suite. Called by pre-push hook.

npx vitest run
