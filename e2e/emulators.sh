#!/usr/bin/env bash
# Start/stop the local cloud emulators used by the e2e cloud scenario.
#
#   bash e2e/emulators.sh up     # S3Mock on :19090, Azurite (blob) on :20000
#   bash e2e/emulators.sh down
#
# Containers join the "xkid1-mp-e2e" network too, so other containers can reach
# them as http://mp-e2e-s3:9090 and http://mp-e2e-azurite:10000 (see docker-matrix.sh).
set -euo pipefail

NETWORK=xkid1-mp-e2e
S3_IMAGE=adobe/s3mock:3.12.0
AZURITE_IMAGE=mcr.microsoft.com/azure-storage/azurite:3.34.0

wait_for_port() {
  local port=$1 name=$2
  for _ in $(seq 1 60); do
    if (exec 3<>"/dev/tcp/127.0.0.1/${port}") 2>/dev/null; then
      echo "✓ ${name} ready on :${port}"
      return 0
    fi
    sleep 1
  done
  echo "✖ ${name} did not start on :${port}" >&2
  docker logs "mp-e2e-${name}" 2>&1 | tail -20 >&2 || true
  return 1
}

case "${1:-}" in
  up)
    docker network inspect "$NETWORK" >/dev/null 2>&1 || docker network create "$NETWORK" >/dev/null
    docker rm -f mp-e2e-s3 mp-e2e-azurite >/dev/null 2>&1 || true
    docker run -d --rm --name mp-e2e-s3 --network "$NETWORK" -p 127.0.0.1:19090:9090 "$S3_IMAGE" >/dev/null
    # --skipApiVersionCheck: newer @azure/storage-blob releases may send API versions
    # this Azurite build doesn't know yet; the blob operations we use are unchanged.
    docker run -d --rm --name mp-e2e-azurite --network "$NETWORK" -p 127.0.0.1:20000:10000 "$AZURITE_IMAGE" \
      azurite-blob --blobHost 0.0.0.0 --skipApiVersionCheck --loose >/dev/null
    wait_for_port 19090 s3
    wait_for_port 20000 azurite
    ;;
  down)
    docker rm -f mp-e2e-s3 mp-e2e-azurite >/dev/null 2>&1 || true
    docker network rm "$NETWORK" >/dev/null 2>&1 || true
    echo "✓ emulators stopped"
    ;;
  *)
    echo "usage: $0 up|down" >&2
    exit 2
    ;;
esac
