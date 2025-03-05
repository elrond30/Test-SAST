#!/bin/bash
# set -o errexit
# set -o pipefail
# set -o nounset

source ./../scripts/check-available-commands.sh
checkCommandsAvailable helm aws kubectl eksctl sed


if test -n "${AWS_REGION-}"; then
  echo "AWS_REGION is set to <$AWS_REGION>"
else
  AWS_REGION=eu-west-1
  echo "AWS_REGION is not set or empty, defaulting to ${AWS_REGION}"
fi

if test -n "${CLUSTERNAME-}"; then
  echo "CLUSTERNAME is set to <$CLUSTERNAME>"
else
  CLUSTERNAME=wrongsecrets-exercise-cluster
  echo "CLUSTERNAME is not set or empty, defaulting to ${CLUSTERNAME}"
fi

ACCOUNT_ID=$(aws sts get-caller-identity | jq '.Account' -r)
echo "ACCOUNT_ID=${ACCOUNT_ID}"

kubectl delete -f k8s/wrongsecrets-balancer-ingress.yml
kubectl delete -f k8s/ctfd-ingress.yaml

sleep 5 # Give the controller some time to catch the ingress change

echo "Cleanup helm chart csi-secrets-store"
helm uninstall csi-secrets-store \
  -n kube-system

echo "Cleanup helm chart projectcalico"
helm uninstall calico \
  -n default
