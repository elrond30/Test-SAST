#!/usr/bin/env bash

source ./scripts/check-available-commands.sh
checkCommandsAvailable helm docker kubectl yq minikube

minikube delete
minikube start  --cpus=6 --memory=8000MB --network-plugin=cni --cni=calico --driver=docker --kubernetes-version=1.30.0
eval $(minikube docker-env)
./build-and-deploy.sh

sleep 15

echo "let's go!"

kubectl port-forward service/wrongsecrets-balancer 3000:3000

kubectl port-forward service/prometheus-server 9090:80

kubectl port-forward service/grafana 80:80
