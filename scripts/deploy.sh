#!/usr/bin/env bash
# Shared deploy step used by BOTH GitHub Actions and Jenkins.
# Applies the Kubernetes manifests, pins the freshly built image and waits for the rollout.
# If the rollout fails, it rolls back to the previous ReplicaSet.
#
# Usage: scripts/deploy.sh <image-ref> [namespace]
#   e.g. scripts/deploy.sh ghcr.io/shubhamkhedkar/orders-api:sha-1a2b3c4 orders
# Set DRY_RUN=1 to render and validate client-side only (no cluster changes).
set -euo pipefail

IMAGE="${1:?usage: deploy.sh <image-ref> [namespace]}"
NAMESPACE="${2:-orders}"
MANIFEST_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../deploy/k8s" && pwd)"
TIMEOUT="${ROLLOUT_TIMEOUT:-120s}"

if [[ "${DRY_RUN:-0}" == "1" ]]; then
  echo "DRY_RUN=1: rendering manifests for ${IMAGE} in namespace ${NAMESPACE}"
  kubectl apply --dry-run=client -n "${NAMESPACE}" -f "${MANIFEST_DIR}"
  exit 0
fi

echo "Deploying ${IMAGE} to namespace ${NAMESPACE}"
kubectl create namespace "${NAMESPACE}" --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -n "${NAMESPACE}" -f "${MANIFEST_DIR}/deployment.yaml" -f "${MANIFEST_DIR}/service.yaml"
kubectl -n "${NAMESPACE}" set image deployment/orders-api orders-api="${IMAGE}"
kubectl -n "${NAMESPACE}" annotate deployment/orders-api \
  kubernetes.io/change-cause="deploy ${IMAGE}" --overwrite

if ! kubectl -n "${NAMESPACE}" rollout status deployment/orders-api --timeout="${TIMEOUT}"; then
  echo "Rollout failed, rolling back" >&2
  kubectl -n "${NAMESPACE}" rollout undo deployment/orders-api
  exit 1
fi
echo "Rollout complete"
