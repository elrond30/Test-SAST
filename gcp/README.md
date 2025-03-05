# Setup your secrets in GCP

In this setup we integrate the secrets exercise with GCP GKE and let pods consume secrets from the GCP Secret manager. If you want to know more about integrating secrets with GKE, check [this link](https://github.com/GoogleCloudPlatform/secrets-store-csi-driver-provider-gcp).
Please make sure that the account in which you run this exercise has either Cloud Audit Logs enabled, or is not linked to your current organization and/or DTAP environment.

## Pre-requisites

Have the following tools installed:

- gcloud CLI - [Installation](https://cloud.google.com/sdk/docs/install)
- Tfenv (Optional) - [Installation](https://github.com/tfutils/tfenv)
- Terraform CLI - [Installation](https://learn.hashicorp.com/tutorials/terraform/install-cli)
- Wget - [Installation](https://www.jcchouinard.com/wget/)
- Helm [Installation](https://helm.sh/docs/intro/install/)
- Kubectl [Installation](https://kubernetes.io/docs/tasks/tools/)
- jq [Installation](https://stedolan.github.io/jq/download/)

Make sure you have an active account at GCP for which you have configured the credentials on the system where you will execute the steps below.

Please note that this setup relies on bash scripts that have been tested in MacOS and Linux. We have no intention of supporting vanilla Windows at the moment.

### Multi-user setup: shared state

If you want to host a multi-user setup, you will probably want to share the state file so that everyone can try related challenges. We have provided a starter to easily do so using a Terraform gcs backend.

First, create an storage bucket:

1. Check whether you have the right project by doing `gcloud config list`. Otherwise configure it by doing `gcloud init`.
2. Change the `project_id` in the `terraform.tfvars` file to your project id
3. Run `gcloud auth application-default login` to be able to use your account credentials for terraform.
4. Navigate to the 'shared-state' directory `cd shared-state`
5. Run `terraform init`
6. Run `terraform apply`.

The bucket name should be in the output. Please use that to configure the Terraform `gcs` backend in [`main.tf`](./main.tf).

## Installation

**Note**: Applying the Terraform means you are creating cloud infrastructure which actually costs you money. The authors are not responsible for any cost coming from following the instructions below. If you have a brand new GCP account, you could use the $300 in credits to set up the infrastructure for free.

**Note-II**: We create resources in `europe-west4` by default. You can set the region by editing `terraform.tfvars`.

**Note-III**: The cluster you create has its access bound to the public IP of the creator. In other words: the cluster you create with this code has its access bound to your public IP-address if you apply it locally.

1. Check whether you have the right project by doing `gcloud config list`. Otherwise configure it by doing `gcloud init`.
2. Change the `project_id` in the `terraform.tfvars` file to your project id
3. Run `gcloud auth application-default login` to be able to use your account credentials for terraform.
4. Enable the required gcloud services using `gcloud services enable compute.googleapis.com container.googleapis.com secretmanager.googleapis.com`
5. Run `terraform init` (if required, use tfenv to select TF 0.14.0 or higher )
6. Run `terraform plan`
7. Run `terraform apply`. Note: the apply will take 10 to 20 minutes depending on the speed of the GCP backplane.
8. Run `export USE_GKE_GCLOUD_AUTH_PLUGIN=True`
9. When creation is done, run `gcloud container clusters get-credentials wrongsecrets-exercise-cluster --region YOUR_REGION`. Note if it errors on a missing plugin to support `kubectl`, then run `gcloud components install gke-gcloud-auth-plugin` and `gcloud container clusters get-credentials wrongsecrets-exercise-cluster --region YOUR_REGION`.
10. Run `./build-and-deploy-gcp.sh`

Your GKE cluster should be visible in [EU-West4](https://console.cloud.google.com/kubernetes?referrer=search&project=wrongsecrets) by default. Want a different region? You can modify `terraform.tfvars` or input it directly using the `region` variable in plan/apply.

Are you done playing? Please run `terraform destroy` twice to clean up.

### Test it

When you have completed the installation steps, you can do `kubectl port-forward service/wrongsecrets-balancer 3000:3000` and then go to [http://localhost:3000](http://localhost:3000).

Want to know how well your cluster is holding up? Check with

```sh
    kubectl top nodes
    kubectl top pods
```

### Configuring CTFd

You can use the [Juiceshop CTF CLI](https://github.com/juice-shop/juice-shop-ctf) to generate CTFd configuration files.

Follow the following steps:

```shell
    npm install -g juice-shop-ctf-cli@10.0.1
    juice-shop-ctf #choose ctfd and https://wrongsecrets-ctf.herokuapp.com as domain. No trailing slash! The key is 'test', by default feel free to enable hints. We do not support snippets or links/urls to code or hints.
```

Now visit the CTFd instance and setup your CTF. To test things locally before setting up a load balancer/ingress, you can use `kubectl port-forward -n ctfd $(kubectl get pods --namespace ctfd -l "app.kubernetes.io/name=ctfd,app.kubernetes.io/instance=ctfd" -o jsonpath="{.items[0].metadata.name}") 8000:8000` and go to `localhost:8000` to visit CTFd.

_!!NOTE:_ **The following can be dangerous if you use CTFd `>= 3.5.0` with wrongsecrets `< 1.5.11`. Check the `challenges.json` and make sure it's 1-indexed - a 0-indexed file will break CTFd!** _/NOTE!!_

Then use the administrative backup function to import the zipfile you created with the juice-shop-ctf command.
After that you will still need to override the flags with their actual values if you do use the 2-domain configuration. For a guide on how to do this see the 2-domain setup steps in the general [README](../readme.md)
Want to setup your own? You can! Watch out for people finding your key though, so secure it properly: make sure the running container with the actual ctf-key is not exposed to the audience, similar to our heroku container.

Want to make the CTFD instance look pretty? Include the fragment located at [./k8s/ctfd_resources/index_fragment.html](/k8s/ctfd_resources/index_fragment.html) in your index.html via the admin panel.

If you want to share with others go to the [When you want to share your environment with others (experimental)](#when-you-want-to-share-your-environment-with-others-experimental) section.

### Configuring the application

In the front page of the application you can edit the description to reference the right urls and the desplayed image. Use the following:

```sh
helm upgrade --install wrongsecrets ../helm/wrongsecrets-ctf-party \
  --set="balancer.env.REACT_APP_MOVING_GIF_LOGO=<>" \
  --set="balancer.env.REACT_APP_HEROKU_WRONGSECRETS_URL=<>" \
  --set="balancer.env.REACT_APP_CTFD_URL='<>'" \
```

### Monitoring the cluster

For a guide on how to use the monitoring setup, see the [monitoring guide](../guides/monitoring-setup/monitoring.md).

### Clean it up

When you're done:

1. Kill the port forward.
2. Run `terraform destroy` to clean up the infrastructure. Note that you may need to repeat the destroy to fully clean up.
3. If you've used the shared state, `cd` to the `shared-state` folder and run `terraform destroy` there too.
4. Run `rm terraform.tf*` to remove local state files.

### A few things to consider

1. Does your worker node now have access as well?
2. Can you easily obtain the AKS managed identity of the Node?
3. Can you get the secrets in the Key vault? Which paths do you see?

### When you want to share your environment with others (experimental)

We added additional scripts for adding a Load Balancer and ingress so that you can use your cloud setup with multiple people.
Do the following:

1. Follow the installation section first.
2. Run `./k8s-nginx-lb-script.sh` and the script will return the url at which you can reach the application. (Be aware this opens the url's to the internet in general, if you'd like to limit the access please do this using the security groups in gcp)
3. When you are done, before you do cleanup, first run `./k8s-nginx-lb-script-cleanup.sh`.

Note that you might have to do some manual cleanups after that.

## Terraform documentation

The documentation below is auto-generated to give insight on what's created via Terraform.

<!-- BEGIN_TF_DOCS -->
## Resources

| Name | Type |
|------|------|
| [google-beta_google_iam_workload_identity_pool.pool](https://registry.terraform.io/providers/hashicorp/google-beta/latest/docs/resources/google_iam_workload_identity_pool) | resource |
| [google_compute_network.vpc](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_network) | resource |
| [google_compute_subnetwork.master_subnet](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_subnetwork) | resource |
| [google_compute_subnetwork.node_subnet](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_subnetwork) | resource |
| [google_container_cluster.gke](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/container_cluster) | resource |
| [google_project_iam_member.wrongsecrets_cluster_sa_roles](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/project_iam_member) | resource |
| [google_project_iam_member.wrongsecrets_workload_sa_roles](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/project_iam_member) | resource |
| [google_secret_manager_secret.wrongsecret_1](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/secret_manager_secret) | resource |
| [google_secret_manager_secret.wrongsecret_2](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/secret_manager_secret) | resource |
| [google_secret_manager_secret.wrongsecret_3](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/secret_manager_secret) | resource |
| [google_secret_manager_secret_iam_member.wrongsecret_1_member](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/secret_manager_secret_iam_member) | resource |
| [google_secret_manager_secret_iam_member.wrongsecret_2_member](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/secret_manager_secret_iam_member) | resource |
| [google_secret_manager_secret_iam_member.wrongsecret_3_member](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/secret_manager_secret_iam_member) | resource |
| [google_secret_manager_secret_version.secret_version_basic](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/secret_manager_secret_version) | resource |
| [google_service_account.wrongsecrets_cluster](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/service_account) | resource |
| [google_service_account.wrongsecrets_workload](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/service_account) | resource |
| [google_service_account_iam_member.wrongsecret_wrong_pod_sa](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/service_account_iam_member) | resource |
| [random_integer.int](https://registry.terraform.io/providers/hashicorp/random/latest/docs/resources/integer) | resource |
| [random_password.password](https://registry.terraform.io/providers/hashicorp/random/latest/docs/resources/password) | resource |
| [http_http.ip](https://registry.terraform.io/providers/hashicorp/http/latest/docs/data-sources/http) | data source |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_cluster_name"></a> [cluster\_name](#input\_cluster\_name) | The GKE cluster name | `string` | `"wrongsecrets-exercise-cluster"` | no |
| <a name="input_cluster_version"></a> [cluster\_version](#input\_cluster\_version) | The GKE cluster version to use | `string` | `"1.30"` | no |
| <a name="input_project_id"></a> [project\_id](#input\_project\_id) | project id | `string` | n/a | yes |
| <a name="input_region"></a> [region](#input\_region) | The GCP region to use | `string` | `"eu-west4"` | no |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_gke_config"></a> [gke\_config](#output\_gke\_config) | config string for the cluster credentials |
| <a name="output_kubernetes_cluster_host"></a> [kubernetes\_cluster\_host](#output\_kubernetes\_cluster\_host) | GKE Cluster Host |
| <a name="output_kubernetes_cluster_name"></a> [kubernetes\_cluster\_name](#output\_kubernetes\_cluster\_name) | GKE Cluster Name |
| <a name="output_project_id"></a> [project\_id](#output\_project\_id) | GCloud Project ID |
| <a name="output_region"></a> [region](#output\_region) | GCloud Region |
<!-- END_TF_DOCS -->

<!-- BEGIN_TF_DOCS -->
## Resources

| Name | Type |
|------|------|
| [google-beta_google_iam_workload_identity_pool.pool](https://registry.terraform.io/providers/hashicorp/google-beta/latest/docs/resources/google_iam_workload_identity_pool) | resource |
| [google_compute_network.vpc](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_network) | resource |
| [google_compute_subnetwork.master_subnet](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_subnetwork) | resource |
| [google_compute_subnetwork.node_subnet](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_subnetwork) | resource |
| [google_container_cluster.gke](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/container_cluster) | resource |
| [google_project_iam_member.wrongsecrets_cluster_sa_roles](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/project_iam_member) | resource |
| [google_project_iam_member.wrongsecrets_workload_sa_roles](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/project_iam_member) | resource |
| [google_secret_manager_secret.wrongsecret_1](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/secret_manager_secret) | resource |
| [google_secret_manager_secret.wrongsecret_2](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/secret_manager_secret) | resource |
| [google_secret_manager_secret.wrongsecret_3](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/secret_manager_secret) | resource |
| [google_secret_manager_secret_iam_member.wrongsecret_1_member](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/secret_manager_secret_iam_member) | resource |
| [google_secret_manager_secret_iam_member.wrongsecret_2_member](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/secret_manager_secret_iam_member) | resource |
| [google_secret_manager_secret_iam_member.wrongsecret_3_member](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/secret_manager_secret_iam_member) | resource |
| [google_secret_manager_secret_version.secret_version_basic](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/secret_manager_secret_version) | resource |
| [google_service_account.wrongsecrets_cluster](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/service_account) | resource |
| [google_service_account.wrongsecrets_workload](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/service_account) | resource |
| [google_service_account_iam_member.wrongsecret_wrong_pod_sa](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/service_account_iam_member) | resource |
| [random_integer.int](https://registry.terraform.io/providers/hashicorp/random/latest/docs/resources/integer) | resource |
| [random_password.password](https://registry.terraform.io/providers/hashicorp/random/latest/docs/resources/password) | resource |
| [http_http.ip](https://registry.terraform.io/providers/hashicorp/http/latest/docs/data-sources/http) | data source |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_cluster_name"></a> [cluster\_name](#input\_cluster\_name) | The GKE cluster name | `string` | `"wrongsecrets-exercise-cluster"` | no |
| <a name="input_cluster_version"></a> [cluster\_version](#input\_cluster\_version) | The GKE cluster version to use | `string` | `"1.30"` | no |
| <a name="input_project_id"></a> [project\_id](#input\_project\_id) | project id | `string` | n/a | yes |
| <a name="input_region"></a> [region](#input\_region) | The GCP region to use | `string` | `"eu-west4"` | no |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_gke_config"></a> [gke\_config](#output\_gke\_config) | config string for the cluster credentials |
| <a name="output_kubernetes_cluster_host"></a> [kubernetes\_cluster\_host](#output\_kubernetes\_cluster\_host) | GKE Cluster Host |
| <a name="output_kubernetes_cluster_name"></a> [kubernetes\_cluster\_name](#output\_kubernetes\_cluster\_name) | GKE Cluster Name |
| <a name="output_project_id"></a> [project\_id](#output\_project\_id) | GCloud Project ID |
| <a name="output_region"></a> [region](#output\_region) | GCloud Region |
<!-- END_TF_DOCS -->
