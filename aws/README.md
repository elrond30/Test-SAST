# Setup your secrets in AWS

In this setup we integrate the secrets-exercise online with AWS EKS and let Pods consume secrets from the AWS Parameter Store and AWS Secrets Manager.
We use managed node groups so as we don't want the hassle of managing the EC2 instances ourselves, and Fargate doesn't suit our needs since we use a StatefulSet. If you want to know more about integrating secrets with EKS, check [EKS and SSM Parameter Store](https://docs.aws.amazon.com/systems-manager/latest/userguide/integrating_csi_driver.html) and [EKS and Secrets Manager](https://docs.aws.amazon.com/secretsmanager/latest/userguide/integrating_csi_driver.html).
Please make sure that the account in which you run this exercise has either CloudTrail enabled, or is not linked to your current organization and/or DTAP environment.

## Pre-requisites

Have the following tools installed:

- AWS CLI - [Installation](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-install.html)
- EKS CTL - [Installation](https://docs.aws.amazon.com/eks/latest/userguide/eksctl.html)
- Tfenv (Optional) - [Installation](https://github.com/tfutils/tfenv)
- Terraform CLI - [Installation](https://learn.hashicorp.com/tutorials/terraform/install-cli)
- Wget - [Installation](https://www.jcchouinard.com/wget/)
- Helm [Installation](https://helm.sh/docs/intro/install/)
- Kubectl [Installation](https://kubernetes.io/docs/tasks/tools/)
- jq [Installation](https://stedolan.github.io/jq/download/)

Make sure you have an active account at AWS for which you have configured the credentials on the system where you will execute the steps below. In this example we stored the credentials under an aws profile as `awsuser`.

## Installation

First, we want to create a shared state. We've provided the terraform code for this in the `shared-state` subfolder.

To create an s3 bucket (optionally add `-var="region=YOUR_DESIRED_REGION"` to the apply to use a region other than the default eu-west-1):

```bash
cd shared-state
terraform init
terraform apply
```

The bucket name should be in the output. Please use that to configure the Terraform backend in `main.tf`.
The bucket ARN will be printed, make a note of this as it will be used in the next steps. It should look something like `arn:aws:s3:::terraform-20230102231352749300000001`.

The terraform code is loosely based on [this EKS managed Node Group TF example](https://github.com/terraform-aws-modules/terraform-aws-eks/tree/master/examples/eks_managed_node_group).

**Note**: Applying the Terraform means you are creating cloud infrastructure which actually costs you money. **_the current boundary is 50 t3a-(X)large nodes_**. Please adapt the servers you deploy to in `main.tf` in this folder to your liking to reduce possible costs. Note that this project can run on a single T3A-Large instance, but this would require reducing the amount of wrongsecretbalancers to 1 (`balancer.replicas=1`). **_The authors are not responsible for any cost coming from following the instructions below_**.

**Note-II**: The cluster you create has its access bound to the public IP of the creator. In other words: the cluster you create with this code has its access bound to your public IP-address if you apply it locally.

1. export your AWS credentials (`export AWS_PROFILE=awsuser`)
2. check whether you have the right profile by doing `aws sts get-caller-identity`. Make sure you have the right account and have the rights to do this.
3. Ensure you have set all the right variables in `terraform.tfvars`. **Optional:** If you want to use a custom domain with TLS, also fill out your domain name(s) and Route53 hosted zone here. Delegate (sub)domains to Route53 nameservers if you're not hosting your domain with Route53: [using the AWS docs](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/CreatingNewSubdomain.html)
4. Do `terraform init` (if required, use tfenv to select TF 0.14.0 or higher )
5. The bucket ARN will be asked in the next 2 steps. Take the one provided to you in the output earlier (e.g., `arn:aws:s3:::terraform-20230102231352749300000001`).
6. Do `terraform plan`
7. Do `terraform apply`. Note: the apply will take 10 to 20 minutes depending on the speed of the AWS backplane.
8. When creation is done, do `aws eks update-kubeconfig --region eu-west-1 --name wrongsecrets-exercise-cluster --kubeconfig ~/.kube/wrongsecrets`
9. Do `export KUBECONFIG=~/.kube/wrongsecrets`
10. Run `./build-and-deploy-aws.sh` to install all the required materials (helm for calico, secrets management, autoscaling, etc.)

Your EKS cluster should be visible in [eu-west-1](https://eu-west-1.console.aws.amazon.com/eks/home?region=eu-west-1#/clusters) by default. Want a different region? You can modify `terraform.tfvars` or input it directly using the `region` variable in plan/apply.

Are you done playing? Please run `terraform destroy` twice to clean up (first in the main `aws` folder, then the `shared-state` subfolder).

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

Now visit the CTFd instance and setup your CTF. If you haven't set up a load balancer/ingress, the you can use `kubectl port-forward -n ctfd $(kubectl get pods --namespace ctfd -l "app.kubernetes.io/name=ctfd,app.kubernetes.io/instance=ctfd" -o jsonpath="{.items[0].metadata.name}") 8000:8000` and go to `localhost:8000` to visit CTFd.

_!!NOTE:_ **The following can be dangerous if you use CTFd `>= 3.5.0` with wrongsecrets `< 1.5.11`. Check the `challenges.json` and make sure it's 1-indexed - a 0-indexed file will break CTFd!** _/NOTE!!_

Then use the administrative backup function to import the zipfile you created with the juice-shop-ctf command.
After that you will still need to override the flags with their actual values if you do use the 2-domain configuration. For a guide on how to do this see the 2-domain setup steps in the general [README](../readme.md)
Want to setup your own? You can! Watch out for people finding your key though, so secure it properly: make sure the running container with the actual ctf-key is not exposed to the audience, similar to our heroku container.

Want to make the CTFD instance look pretty? Include the fragment located at [./k8s/ctfd_resources/index_fragment.html](/k8s/ctfd_resources/index_fragment.html) in your index.html via the admin panel.

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
2. Run the cleanup script: `./cleanup-aws-autoscaling-and-helm.sh`
3. Run `terraform destroy` to clean up the infrastructure.
   1. If you've deployed the `shared-state` s3 bucket, also `cd shared-state` and `terraform destroy` there.
4. Run `unset KUBECONFIG` to unset the KUBECONFIG env var.
5. Run `rm ~/.kube/wrongsecrets` to remove the kubeconfig file.
6. Run `rm terraform.tfstate*` to remove local state files.

### A few things to consider

1. Does your worker node now have access as well?
2. Can you easily obtain the instance profile of the Node?
3. Can you get the secrets in the SSM Parameter Store and Secrets Manager easily? Which paths do you see?
4. Which of the 2 (SSM Parameter Store and Secrets Manager) works cross-account?
5. If you have applied the secrets to the cluster, you should see at the configuration details of the cluster that Secrets encryption is "Disabled", what does that mean?

### When you want to share your environment with others (experimental)

We added additional scripts for adding an ALB and ingress so that you can use your cloudsetup with multiple people.
Do the following:

1. Follow the installation section first.
2. Run `./k8s-aws-alb-script.sh` and the script will return the url at which you can reach the application. (Be aware this opens the url's to the internet in general, if you'd like to limit the access please do this using the security groups in AWS)
3. When you are done, before you do cleanup, first run `./k8s-aws-alb-script-cleanup.sh`.

Note that you might have to do some manual cleanups after that.

## Terraform documentation

The documentation below is auto-generated to give insight on what's created via Terraform.

<!-- BEGIN_TF_DOCS -->
## Resources

| Name | Type |
|------|------|
| [aws_iam_access_key.state_user_key](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_access_key) | resource |
| [aws_iam_policy.secret_deny](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_policy) | resource |
| [aws_iam_policy.secret_manager](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_policy) | resource |
| [aws_iam_role.irsa_role](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role) | resource |
| [aws_iam_role.secret_reader](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role) | resource |
| [aws_iam_role.user_role](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role) | resource |
| [aws_iam_role_policy.user_secret_reader](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role_policy) | resource |
| [aws_iam_role_policy_attachment.irsa_role_attachment](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role_policy_attachment) | resource |
| [aws_iam_role_policy_attachment.user_role_attachment](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role_policy_attachment) | resource |
| [aws_iam_user.state_user](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_user) | resource |
| [aws_iam_user_policy.state_user_policy](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_user_policy) | resource |
| [aws_secretsmanager_secret.secret](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/secretsmanager_secret) | resource |
| [aws_secretsmanager_secret.secret_2](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/secretsmanager_secret) | resource |
| [aws_secretsmanager_secret.state_user_access_keys](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/secretsmanager_secret) | resource |
| [aws_secretsmanager_secret_policy.policy](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/secretsmanager_secret_policy) | resource |
| [aws_secretsmanager_secret_policy.policy_2](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/secretsmanager_secret_policy) | resource |
| [aws_secretsmanager_secret_version.secret](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/secretsmanager_secret_version) | resource |
| [aws_secretsmanager_secret_version.state_user_access_keys](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/secretsmanager_secret_version) | resource |
| [aws_ssm_parameter.secret](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ssm_parameter) | resource |
| [random_password.password](https://registry.terraform.io/providers/hashicorp/random/latest/docs/resources/password) | resource |
| [random_password.password2](https://registry.terraform.io/providers/hashicorp/random/latest/docs/resources/password) | resource |
| [aws_availability_zones.available](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/availability_zones) | data source |
| [aws_caller_identity.current](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/caller_identity) | data source |
| [aws_iam_policy_document.assume_role_for_secret_reader](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document) | data source |
| [aws_iam_policy_document.assume_role_with_oidc](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document) | data source |
| [aws_iam_policy_document.secret_manager](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document) | data source |
| [aws_iam_policy_document.state_user_policy](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document) | data source |
| [aws_iam_policy_document.user_assume_role](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document) | data source |
| [aws_iam_policy_document.user_policy](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document) | data source |
| [aws_iam_policy_document.user_secret_reader](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document) | data source |
| [http_http.ip](https://registry.terraform.io/providers/hashicorp/http/latest/docs/data-sources/http) | data source |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_balancer_domain_name"></a> [balancer\_domain\_name](#input\_balancer\_domain\_name) | The domain name to use | `string` | `""` | no |
| <a name="input_cluster_name"></a> [cluster\_name](#input\_cluster\_name) | The EKS cluster name | `string` | `"wrongsecrets-exercise-cluster"` | no |
| <a name="input_cluster_version"></a> [cluster\_version](#input\_cluster\_version) | The EKS cluster version to use | `string` | `"1.30"` | no |
| <a name="input_ctfd_domain_name"></a> [ctfd\_domain\_name](#input\_ctfd\_domain\_name) | The domain name to use | `string` | `""` | no |
| <a name="input_extra_allowed_ip_ranges"></a> [extra\_allowed\_ip\_ranges](#input\_extra\_allowed\_ip\_ranges) | Allowed IP ranges in addition to creator IP | `list(string)` | `[]` | no |
| <a name="input_hosted_zone_id"></a> [hosted\_zone\_id](#input\_hosted\_zone\_id) | The ID of the Route53 Hosted Zone to use | `string` | `""` | no |
| <a name="input_region"></a> [region](#input\_region) | The AWS region to use | `string` | `"eu-west-1"` | no |
| <a name="input_state_bucket_arn"></a> [state\_bucket\_arn](#input\_state\_bucket\_arn) | ARN of the state bucket to grant access to the s3 user | `string` | n/a | yes |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_balancer_acm_cert_arn"></a> [balancer\_acm\_cert\_arn](#output\_balancer\_acm\_cert\_arn) | Balancer ACM certificate ARN |
| <a name="output_balancer_domain_name"></a> [balancer\_domain\_name](#output\_balancer\_domain\_name) | Balancer domain name |
| <a name="output_cluster_autoscaler_role"></a> [cluster\_autoscaler\_role](#output\_cluster\_autoscaler\_role) | Cluster autoscaler role |
| <a name="output_cluster_autoscaler_role_arn"></a> [cluster\_autoscaler\_role\_arn](#output\_cluster\_autoscaler\_role\_arn) | Cluster autoscaler role arn |
| <a name="output_cluster_endpoint"></a> [cluster\_endpoint](#output\_cluster\_endpoint) | Endpoint for EKS control plane. |
| <a name="output_cluster_id"></a> [cluster\_id](#output\_cluster\_id) | The id of the cluster |
| <a name="output_cluster_name"></a> [cluster\_name](#output\_cluster\_name) | The EKS cluster name |
| <a name="output_cluster_security_group_id"></a> [cluster\_security\_group\_id](#output\_cluster\_security\_group\_id) | Security group ids attached to the cluster control plane. |
| <a name="output_ctfd_acm_cert_arn"></a> [ctfd\_acm\_cert\_arn](#output\_ctfd\_acm\_cert\_arn) | CTFd ACM certificate ARN |
| <a name="output_ctfd_domain_name"></a> [ctfd\_domain\_name](#output\_ctfd\_domain\_name) | CTFd domain name |
| <a name="output_ebs_role"></a> [ebs\_role](#output\_ebs\_role) | EBS CSI driver role |
| <a name="output_ebs_role_arn"></a> [ebs\_role\_arn](#output\_ebs\_role\_arn) | EBS CSI driver role |
| <a name="output_external_dns_role_arn"></a> [external\_dns\_role\_arn](#output\_external\_dns\_role\_arn) | External DNS role |
| <a name="output_irsa_role"></a> [irsa\_role](#output\_irsa\_role) | The role name used in the IRSA setup |
| <a name="output_irsa_role_arn"></a> [irsa\_role\_arn](#output\_irsa\_role\_arn) | The role ARN used in the IRSA setup |
| <a name="output_load_balancer_controller_role"></a> [load\_balancer\_controller\_role](#output\_load\_balancer\_controller\_role) | Load balancer controller role |
| <a name="output_load_balancer_controller_role_arn"></a> [load\_balancer\_controller\_role\_arn](#output\_load\_balancer\_controller\_role\_arn) | Load balancer controller role arn |
| <a name="output_secrets_manager_secret_name"></a> [secrets\_manager\_secret\_name](#output\_secrets\_manager\_secret\_name) | The name of the secrets manager secret |
| <a name="output_state_bucket_name"></a> [state\_bucket\_name](#output\_state\_bucket\_name) | Terraform s3 state bucket name |
<!-- END_TF_DOCS -->

<!-- BEGIN_TF_DOCS -->
## Resources

| Name | Type |
|------|------|
| [aws_iam_access_key.state_user_key](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_access_key) | resource |
| [aws_iam_policy.secret_deny](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_policy) | resource |
| [aws_iam_policy.secret_manager](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_policy) | resource |
| [aws_iam_role.irsa_role](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role) | resource |
| [aws_iam_role.secret_reader](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role) | resource |
| [aws_iam_role.user_role](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role) | resource |
| [aws_iam_role_policy.user_secret_reader](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role_policy) | resource |
| [aws_iam_role_policy_attachment.irsa_role_attachment](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role_policy_attachment) | resource |
| [aws_iam_role_policy_attachment.user_role_attachment](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role_policy_attachment) | resource |
| [aws_iam_user.state_user](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_user) | resource |
| [aws_iam_user_policy.state_user_policy](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_user_policy) | resource |
| [aws_secretsmanager_secret.secret](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/secretsmanager_secret) | resource |
| [aws_secretsmanager_secret.secret_2](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/secretsmanager_secret) | resource |
| [aws_secretsmanager_secret.state_user_access_keys](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/secretsmanager_secret) | resource |
| [aws_secretsmanager_secret_policy.policy](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/secretsmanager_secret_policy) | resource |
| [aws_secretsmanager_secret_policy.policy_2](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/secretsmanager_secret_policy) | resource |
| [aws_secretsmanager_secret_version.secret](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/secretsmanager_secret_version) | resource |
| [aws_secretsmanager_secret_version.state_user_access_keys](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/secretsmanager_secret_version) | resource |
| [aws_ssm_parameter.secret](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ssm_parameter) | resource |
| [random_password.password](https://registry.terraform.io/providers/hashicorp/random/latest/docs/resources/password) | resource |
| [random_password.password2](https://registry.terraform.io/providers/hashicorp/random/latest/docs/resources/password) | resource |
| [aws_availability_zones.available](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/availability_zones) | data source |
| [aws_caller_identity.current](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/caller_identity) | data source |
| [aws_iam_policy_document.assume_role_for_secret_reader](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document) | data source |
| [aws_iam_policy_document.assume_role_with_oidc](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document) | data source |
| [aws_iam_policy_document.secret_manager](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document) | data source |
| [aws_iam_policy_document.state_user_policy](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document) | data source |
| [aws_iam_policy_document.user_assume_role](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document) | data source |
| [aws_iam_policy_document.user_policy](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document) | data source |
| [aws_iam_policy_document.user_secret_reader](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document) | data source |
| [http_http.ip](https://registry.terraform.io/providers/hashicorp/http/latest/docs/data-sources/http) | data source |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_balancer_domain_name"></a> [balancer\_domain\_name](#input\_balancer\_domain\_name) | The domain name to use | `string` | `""` | no |
| <a name="input_cluster_name"></a> [cluster\_name](#input\_cluster\_name) | The EKS cluster name | `string` | `"wrongsecrets-exercise-cluster"` | no |
| <a name="input_cluster_version"></a> [cluster\_version](#input\_cluster\_version) | The EKS cluster version to use | `string` | `"1.30"` | no |
| <a name="input_ctfd_domain_name"></a> [ctfd\_domain\_name](#input\_ctfd\_domain\_name) | The domain name to use | `string` | `""` | no |
| <a name="input_extra_allowed_ip_ranges"></a> [extra\_allowed\_ip\_ranges](#input\_extra\_allowed\_ip\_ranges) | Allowed IP ranges in addition to creator IP | `list(string)` | `[]` | no |
| <a name="input_hosted_zone_id"></a> [hosted\_zone\_id](#input\_hosted\_zone\_id) | The ID of the Route53 Hosted Zone to use | `string` | `""` | no |
| <a name="input_region"></a> [region](#input\_region) | The AWS region to use | `string` | `"eu-west-1"` | no |
| <a name="input_state_bucket_arn"></a> [state\_bucket\_arn](#input\_state\_bucket\_arn) | ARN of the state bucket to grant access to the s3 user | `string` | n/a | yes |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_balancer_acm_cert_arn"></a> [balancer\_acm\_cert\_arn](#output\_balancer\_acm\_cert\_arn) | Balancer ACM certificate ARN |
| <a name="output_balancer_domain_name"></a> [balancer\_domain\_name](#output\_balancer\_domain\_name) | Balancer domain name |
| <a name="output_cluster_autoscaler_role"></a> [cluster\_autoscaler\_role](#output\_cluster\_autoscaler\_role) | Cluster autoscaler role |
| <a name="output_cluster_autoscaler_role_arn"></a> [cluster\_autoscaler\_role\_arn](#output\_cluster\_autoscaler\_role\_arn) | Cluster autoscaler role arn |
| <a name="output_cluster_endpoint"></a> [cluster\_endpoint](#output\_cluster\_endpoint) | Endpoint for EKS control plane. |
| <a name="output_cluster_id"></a> [cluster\_id](#output\_cluster\_id) | The id of the cluster |
| <a name="output_cluster_name"></a> [cluster\_name](#output\_cluster\_name) | The EKS cluster name |
| <a name="output_cluster_security_group_id"></a> [cluster\_security\_group\_id](#output\_cluster\_security\_group\_id) | Security group ids attached to the cluster control plane. |
| <a name="output_ctfd_acm_cert_arn"></a> [ctfd\_acm\_cert\_arn](#output\_ctfd\_acm\_cert\_arn) | CTFd ACM certificate ARN |
| <a name="output_ctfd_domain_name"></a> [ctfd\_domain\_name](#output\_ctfd\_domain\_name) | CTFd domain name |
| <a name="output_ebs_role"></a> [ebs\_role](#output\_ebs\_role) | EBS CSI driver role |
| <a name="output_ebs_role_arn"></a> [ebs\_role\_arn](#output\_ebs\_role\_arn) | EBS CSI driver role |
| <a name="output_external_dns_role_arn"></a> [external\_dns\_role\_arn](#output\_external\_dns\_role\_arn) | External DNS role |
| <a name="output_irsa_role"></a> [irsa\_role](#output\_irsa\_role) | The role name used in the IRSA setup |
| <a name="output_irsa_role_arn"></a> [irsa\_role\_arn](#output\_irsa\_role\_arn) | The role ARN used in the IRSA setup |
| <a name="output_load_balancer_controller_role"></a> [load\_balancer\_controller\_role](#output\_load\_balancer\_controller\_role) | Load balancer controller role |
| <a name="output_load_balancer_controller_role_arn"></a> [load\_balancer\_controller\_role\_arn](#output\_load\_balancer\_controller\_role\_arn) | Load balancer controller role arn |
| <a name="output_secrets_manager_secret_name"></a> [secrets\_manager\_secret\_name](#output\_secrets\_manager\_secret\_name) | The name of the secrets manager secret |
| <a name="output_state_bucket_name"></a> [state\_bucket\_name](#output\_state\_bucket\_name) | Terraform s3 state bucket name |
<!-- END_TF_DOCS -->
