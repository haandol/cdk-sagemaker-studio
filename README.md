# Sagemaker Studio with VPC using CDK

This repository will provision following resources to your account.

<img src="https://docs.aws.amazon.com/images/sagemaker/latest/dg/images/studio/studio-vpc-private.png" alt="studui vpc" />

# Prerequisite

- setup awscli
- node 16.x
- cdk 2.x

## Configuration

open [**infra/config/dev.toml**](/infra/config/dev.toml) and fill the empty fields
and copy `config/dev.toml` file to project root as `.toml`

> Remove all optional fields for empty value (empty value will be failed on validation)

```bash
$ cd infra
$ cp config/dev.toml .toml
```

## Install dependencies

```bash
$ cd infra
$ npm i -g aws-cdk@2.113.0
$ npm i
```

## Provision

```bash
$ cdk bootstrap
$ cdk deploy "*" --require-approval never
```

## Enable Project templates

> Enable Project templates and JumpStart for Studio users before Run any Apps

1. Move to [Domains](https://ap-northeast-2.console.aws.amazon.com/sagemaker/home?region=ap-northeast-2#/studio)
2. Select domain and click **Edit**
3. Click **Next**
4. Enable **Enable Amazon SageMaker project templates and Amazon SageMaker JumpStart for Studio users**
5. Click **Submit**

## Enable CodeWhisperer on Sagemaker Studio (Optional)

https://docs.aws.amazon.com/codewhisperer/latest/userguide/sagemaker-setup.html

open terminal and run following code,

```bash
conda activate studio
pip install amazon-codewhisperer-jupyterlab-ext
jupyter server extension enable amazon_codewhisperer_jupyterlab_ext
conda deactivate
restart-jupyter-server
```
