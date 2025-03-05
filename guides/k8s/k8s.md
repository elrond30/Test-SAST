# Example Setup with kubernetes(k8s)

**WARNING:** It takes into account that you already have k8s cluster setup.
**WARNING-2:** this document is not yet up to date, it will be fixed in [https://github.com/OWASP/wrongsecrets-ctf-party/issues/79](https://github.com/OWASP/wrongsecrets-ctf-party/issues/79).


## Prerequisites

This example expects you to have the following cli tools setup.

1. [helm](https://helm.sh)
2. [kubectl](https://kubernetes.io/docs/tasks/tools/install-kubectl/#install-kubectl-on-linux)

## Step 1. Starting the cluster

```bash
# First we'll need to confirm things are running
# This should be instant, and return something along the lines of "Kubernetes control-plane is running at https://localhost:6443"
kubectl cluster-info
```

## Step 2. Installing WrongSecrets CTF Party via helm

```bash
# You'll need to add the wrongsecrets-ctf-party helm repo to your helm repos
helm repo add wrongsecrets-ctf-party: [https://owasp.org/wrongsecrets-ctf-party](https://owasp.org/wrongsecrets-ctf-party)

helm install wrongsecrets-ctf-party wrongsecrets-ctf-party/wrongsecrets-ctf-party

# kubernetes will now spin up the pods
# to verify every thing is starting up, run:
kubectl get pods

# This should show you two pods a wrongsecrets-balancer pod and a unusued-progress-watchdog pod
# Wait until both pods are ready
```

## Step 3. Verify the app is running correctly

This step is optional, but helpful to catch errors quicker.

```bash
# lets test out if the app is working correctly before proceeding
# for that we can port forward the Wrongsecrets-balancer service to your local machine
kubectl port-forward service/wrongsecrets-balancer 3000:3000

# Open up your browser for localhost:3000
# You should be able to see the WrongSecrets Balancer UI

# Try to create a team and see if everything works correctly
# You should be able to access a WrongSecrets and webtop instances after a few seconds after creating a team,
# and after clicking the "Start Hacking" Button

# You can also try out if the admin UI works correctly
# Go back to localhost:3000/balancer
# To log in as the admin log in as the team "admin"
# The password for the team gets auto generated if not specified, you can extract it from the kubernetes secret:
kubectl get secrets wrongsecrets-balancer-secret -o=jsonpath='{.data.adminPassword}' | base64 --decode
```

## Step 4. Make a service to expose WrongSecrets Balancer outside of the cluster

```bash
# make sure the balancer is running without errors.
kubectl get pods

# We got a example loadbalancer yaml for this example in the repository
wget https://raw.githubusercontent.com/OWASP/wrongsecrets-ctf-party/main/guides/k8s/wrongsecrets-ctf-party-loadbalancer.yaml

# Create the loadbalancer
# This might take a couple of minutes
kubectl apply -f wrongsecrets-ctf-party-loadbalancer.yaml

# If it takes longer than a few minutes take a detailed look at the loadbalancer
kubectl describe svc wrongsecrets-ctf-party-loadbalancer
```

## Step 5. Deinstallation

```bash
helm uninstall wrongsecrets-ctf-party

# Delete the loadbalancer
kubectl delete -f wrongsecrets-ctf-party-loadbalancer.yaml
```
