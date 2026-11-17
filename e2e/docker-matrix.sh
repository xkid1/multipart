#!/usr/bin/env bash
# Run the end-user suite on several Node.js versions, each in a clean official
# node:<version> container, against one packed tarball and the cloud emulators.
#
#   bash e2e/docker-matrix.sh                  # Node 18 20 22 24 26
#   E2E_NODE_VERSIONS="22 24" bash e2e/docker-matrix.sh
#   E2E_PM=pnpm bash e2e/docker-matrix.sh      # install with pnpm (via corepack)
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSIONS="${E2E_NODE_VERSIONS:-18 20 22 24 26}"
PM="${E2E_PM:-npm}"
PACK_DIR="$(mktemp -d "${TMPDIR:-/tmp}/xkid1-multipart-pack-XXXXXX")"
LOG_DIR="${PACK_DIR}/logs"
mkdir -p "$LOG_DIR"

cleanup() {
  bash "$REPO_ROOT/e2e/emulators.sh" down >/dev/null 2>&1 || true
  rm -rf "$PACK_DIR"
}
trap cleanup EXIT

echo "▸ Packing (npm pack runs prepack → yarn build)..."
TARBALL="$(cd "$REPO_ROOT" && npm pack --pack-destination "$PACK_DIR" --loglevel=error | tail -1)"
echo "▸ Tarball: $TARBALL"

bash "$REPO_ROOT/e2e/emulators.sh" up

declare -a RESULTS
STATUS=0
for version in $VERSIONS; do
  echo
  echo "════════ Node ${version} (${PM}) ════════"
  PM_SETUP=""
  [ "$PM" = "pnpm" ] && PM_SETUP="corepack enable pnpm >/dev/null 2>&1 && "
  if docker run --rm \
      --network xkid1-mp-e2e \
      -v "$REPO_ROOT/e2e:/e2e:ro" \
      -v "$PACK_DIR:/pack:ro" \
      -e E2E_S3_ENDPOINT=http://mp-e2e-s3:9090 \
      -e E2E_AZURE_ENDPOINT=http://mp-e2e-azurite:10000/devstoreaccount1 \
      -e E2E_REQUIRE_CLOUD=1 \
      -e COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
      "node:${version}-slim" \
      bash -c "${PM_SETUP}node /e2e/run.mjs --pm ${PM} --tarball /pack/${TARBALL}" \
      2>&1 | tee "$LOG_DIR/node-${version}.log"; then
    RESULTS+=("PASS  Node ${version}  $(tail -1 "$LOG_DIR/node-${version}.log" | sed 's/^ *//')")
  else
    RESULTS+=("FAIL  Node ${version}  $(tail -1 "$LOG_DIR/node-${version}.log" | sed 's/^ *//')")
    STATUS=1
  fi
done

echo
echo "════════ Node.js matrix (${PM}) ════════"
printf '  %s\n' "${RESULTS[@]}"
exit $STATUS
