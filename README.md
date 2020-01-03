# DVC Github action for CD4ML [![GitHub Actions Workflow](https://github.com/iterative/dvc-action/workflows/dvc-action/badge.svg)](https://github.com/iterative/dvc-action/actions)

DVC is a great tool as a data versioning system, but also is great as a build tool for ML experimentation. This action offers the possibility of using DVC to stablish your ML pipeline to be runned by Github Actions CI/CD were you could use your own runners with special capabilities like GPUs. Think on Gradle or Maven for ML.

The action performs:

 - Automatic commit and push to git and dvc once the pipeline runs.
 - Generates a DVC report as a github check.
 - Generates an experiment release with metrics as changelog.

## Input variables

Variable | Required | Default | Info
--- | --- | --- | ---
github_token | yes |  | Is the github_token, this is normally setted automatically by github as a secret.
dvc_repro_file | no | Dvcfile | If a file is given dvc will run the pipeline. If None is given will skip the process

### [ci skip] support
If your commit comment includes the tag the dvc action will skip returning a 0 status code (success). Github is only accepting 0 or 1 as status codes. Any value like 78 for neutral is invalid.

### env variables
Dvc remote is set using env variables [Working with DVC remotes].


## Usage

This action depends on: 
 - actions/checkout
 - actions/setup-python.

Simple example of your workflow with DVC action:

```yaml
name: your-workflow-name

on: [push, pull_request]

jobs:
  run:

    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v1

      - name: setup python 
        uses: actions/setup-python@v1
        with:
          python-version: 2.7

      - uses: iterative/dvc-action
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          dvc_repro_file: your-file.dvc
          
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}

          
```

## Working with DVC remotes

Dvc support different kinds of remote [storage](https://dvc.org/doc/command-reference/remote/add). 
To setup them properely you have to setup credentials (if needed) as enviroment variables. We choose env variables and not inputs to be compatible with other github actions that set credentials like https://github.com/aws-actions/configure-aws-credentials.  
Of course we recommend you to set those variables as [secrets](https://help.github.com/es/actions/automating-your-workflow-with-github-actions/creating-and-using-encrypted-secrets) to keep the safe.

#### S3 and S3 compatible storage (Minio, DigitalOcean Spaces, IBM Cloud Object Storage...) 

```yaml
- uses: iterative/dvc-action
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    dvc_repro_file: your-file.dvc
    
  env:
    AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
    AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    AWS_SESSION_TOKEN: ${{ secrets.AWS_SESSION_TOKEN }}
```

:point_right: AWS_SESSION_TOKEN is optional.

#### Azure

```yaml
  env:
    AZURE_STORAGE_CONNECTION_STRING: ${{ secrets.AZURE_STORAGE_CONNECTION_STRING }}
    AZURE_STORAGE_CONTAINER_NAME: ${{ secrets.AZURE_STORAGE_CONTAINER_NAME }}
```

#### Aliyn

```yaml
  env:
    OSS_BUCKET: ${{ secrets.OSS_BUCKET }}
    OSS_ACCESS_KEY_ID: ${{ secrets.OSS_ACCESS_KEY_ID }}
    OSS_ACCESS_KEY_SECRET: ${{ secrets.OSS_ACCESS_KEY_SECRET }}
    OSS_ENDPOINT: ${{ secrets.OSS_ENDPOINT }}
```

#### Google Storage

:warning: 
Normally, GOOGLE_APPLICATION_CREDENTIALS points to the path of the json file that contains the credentials. However in the action this variable CONTAINS the content of the file. Copy that json and add it as a secret.

```yaml
  env:
    GOOGLE_APPLICATION_CREDENTIALS: ${{ secrets.GOOGLE_APPLICATION_CREDENTIALS }}
```

#### Google Drive

:warning: 
After configuring your [Google Drive credentials](https://dvc.org/doc/command-reference/remote/add) you will find a json file at ```your_project_path/.dvc/tmp/gdrive-user-credentials.json```. Copy that json and add it as a secret.

```yaml
  env:
    GDRIVE_USER_CREDENTIALS: ${{ secrets.GDRIVE_USER_CREDENTIALS }}
```

#### SSH

```yaml
  env:
    DVC_REMOTE_SSH_KEY: ${{ secrets.DVC_REMOTE_SSH_KEY }}
```


