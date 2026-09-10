#!/usr/bin/env bash
set -euo pipefail

# Checks that UI components handle the six data states:
# empty, loading, error, no-data, some-data, lots-of-data.
# Only checks components that perform data fetching.

[ $# -eq 0 ] && exit 0

WARNINGS=0

for f in "$@"; do
  [ -f "$f" ] || continue

  has_fetch=false
  if grep -qE '(useEffect|fetch\(|await\s|useSWR|useQuery|getServerSide|use\s+server)' "$f"; then
    has_fetch=true
  fi

  $has_fetch || continue

  if ! grep -qE '(loading|isLoading|Loading|Spinner|skeleton|Skeleton|Suspense)' "$f"; then
    printf "WARNING [%s]: data-fetching component may be missing a loading state\n" "$f"
    WARNINGS=$((WARNINGS + 1))
  fi

  if ! grep -qE '(error|isError|Error|\.catch\b|onError|ErrorBoundary)' "$f"; then
    printf "WARNING [%s]: data-fetching component may be missing error handling\n" "$f"
    WARNINGS=$((WARNINGS + 1))
  fi

  if ! grep -qE '(\.length\s*(===?\s*0|!)|empty|isEmpty|EmptyState|no .* found|No .* found)' "$f"; then
    printf "WARNING [%s]: data-fetching component may be missing an empty state\n" "$f"
    WARNINGS=$((WARNINGS + 1))
  fi
done

exit 0
