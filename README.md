# DVC Github action for CD4ML [![GitHub Actions Workflow](https://github.com/iterative/dvc-action/workflows/dvc-action/badge.svg)](https://github.com/iterative/dvc-action/actions)

DVC is a great tool as a data versioning system, but also is great as a build tool for ML experimentation. This action offers the possibility of using DVC to stablish your ML pipeline to be runned by Github Actions CI/CD were you could use your own runners with special capabilities like GPUs. Think on Gradle or Maven for ML.

The action performs:

 1. Dvc repro 
 2. Push changes into dvc remote and git remote
 3. Generates a DVC Report as a github check displaying all the experiment metrics
 4. Generates a Relase with desired files and Dvc Report as a "changelog"
 

## Usage

This action depends on: 
 - actions/checkout
 - actions/setup-python

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

## Input variables

Variable | Type | Required | Default | Info
--- | --- | --- | --- | ---
github_token | string | yes |  | Is the github_token, this is setted automatically by Github as a secret.
dvc_repro_file | string | no | Dvcfile | If a file is given dvc will run the pipeline. If None is given will skip the process
release_skip | boolean | no | true | If set skips generating a release
release_files | array | no | [] | Add all the given files to the release

### Support for [ci skip] comment
If your commit comment includes the tag the dvc action will skip returning a 0 status code (success). Github is only accepting 0 or 1 as status codes. Any value like 78 for neutral is invalid.

### env variables
Dvc remote is set using env variables see [Working with DVC remotes](##working-with-dvc-remotes).


## Working with DVC remotes

Dvc support different kinds of remote [storage](https://dvc.org/doc/command-reference/remote/add). 
To setup them properly you have to setup credentials (if needed) as enviroment variables. We choose env variables and not inputs to be compatible with other github actions that set credentials like https://github.com/aws-actions/configure-aws-credentials.  
We recommend you to set those variables as [secrets](https://help.github.com/es/actions/automating-your-workflow-with-github-actions/creating-and-using-encrypted-secrets) to keep them secure.

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


## DVC Metrics

One of the things that DVC can help you with are [metrics](https://dvc.org/doc/command-reference/metrics). Dvc-action has been extended to support metrics in the form of json. Dvc metrics will be displayed in the DVC Report (as a Github check or in the Dvc-action automatic release text).

### Common metrics
They are not json metrics and they will be displayed as a code block

```
accuracy 92.4
```

### Json metrics
Any json object will be transformed into a table.

```json
{ "batch_size": 128, "num_steps": 2000, "learning_rate": 0.05, "took": 0.004629 }
```

|batch_size|num_steps|learning_rate|took|
|----|----|----|----|
|128|2000|0.05|0.004629| 

### Json Vega and Vega-lite metrics

Vega and Vega-lite are visualization grammars that are widely used. 

```json
{
  "$schema": "https://vega.github.io/schema/vega-lite/v4.json",
  "data": {"values": [
      {"x": 100, "y": 50},
      {"x": 150, "y": 100},
      {"x": 200, "y": 70},
      {"x": 250, "y": 90}
  ]},
  "mark": "line",
  "encoding": {
    "x": {"field": "x", "type": "quantitative"},
    "y": {"field": "y", "type": "quantitative"}
  }
}
```

![https://i.imgur.com/fhWKHZm.png](https://i.imgur.com/fhWKHZm.png)


## Examples
 - [Tensorflow Mnist](https://github.com/DavidGOrtega/dvc-action/wiki/Tensorflow-Mnist)
 
 
# Vegametrics

Dvc-action includes a command line tool that injects dvc metrics into vega spec as a dataset. Output is a folder containing a vega embed and png with the following structure:

 - output_folder
   - spec.json
   - index.html
   - graph.png
   
Todo do such thing vegametrics injects dvc json metric files according to [dvc metrics viz](https://gist.github.com/DavidGOrtega/705d7c1327c3a20bc069e3f1d09d4548#gistcomment-3147323)


## Example 

![image](https://user-images.githubusercontent.com/414967/73121670-6d41b380-3f74-11ea-9318-adc5b97cd5e2.png)


This example is done with the following spec and metrics that belongs to repo branches. Vegametrics parses the vega spec (template) reads that data comes from "joined" dataset. vegametrics will extract all the metrics from different branches using ```dvc get``` joining them all toguether.

Spec
```json
{
    "$schema": "https://vega.github.io/schema/vega-lite/v4.json",
    "datasets": { "joined": [ "history.json@current", "history.json@branch1", "history.json@branch2" ] },
    "data": { "name": "joined" }, 
    "repeat": ["accu", "loss", "val_accu", "val_loss"],
    "columns": 2,
    "spec": {  
        "mark": "line",
        "encoding": {
            "x": {"field": "step", "type": "quantitative"},
            "y": {"field": {"repeat": "repeat"}, "type": "quantitative"},
            "color": {"field": "@experiment", "type": "nominal"},
            "opacity": { 
                "condition": {
                "test": "datum['@experiment'] === 'current'",
                "value": 1
                },
                "value": 0.2
            }
        }
    }
}
```

master or current branch
```json 
[
    {"step":0, "accu":0, "loss":1, "val_accu":0, "val_loss":1}, 
    {"step":1, "accu":0.3, "loss":0.8, "val_accu":0.35, "val_loss": 0.85}, 
    {"step":3, "accu":0.6, "loss":0.6, "val_accu":0.65, "val_loss": 0.65}, 
    {"step":4, "accu":0.8, "loss":0.3, "val_accu":0.85, "val_loss": 0.35}, 
    {"step":5, "accu":0.9, "loss":0.1, "val_accu":0.95, "val_loss":0.15}
]
```

branch1
```json
  [
      {"step":0, "accu":0, "loss":1, "val_accu":0, "val_loss":1}, 
      {"step":1, "accu":0.4, "loss":0.9, "val_accu":0.4, "val_loss": 0.9}, 
      {"step":3, "accu":0.5, "loss":0.7, "val_accu":0.5, "val_loss": 0.7}, 
      {"step":4, "accu":0.6, "loss":0.5, "val_accu":0.6, "val_loss": 0.5}, 
      {"step":5, "accu":0.8, "loss":0.3, "val_accu":0.8, "val_loss":0.3},
  ]
```  

branch2
```json
    [
        {"step":0, "accu":0, "loss":1, "val_accu":0, "val_loss":1}, 
        {"step":1, "accu":0.35, "loss":0.7, "val_accu":0.5, "val_loss": 0.7}, 
        {"step":3, "accu":0.66, "loss":0.5, "val_accu":0.6, "val_loss": 0.5}, 
        {"step":4, "accu":0.88, "loss":0.2, "val_accu":0.9, "val_loss": 0.2}, 
        {"step":5, "accu":0.99, "loss":0.05, "val_accu":0.99, "val_loss":0.05}
    ]
```


## Installation 

This will install vegametrics command line in your system
```sh
npm install -g git+https://github.com/DavidGOrtega/dvc-action.git
```

## Usage

:eyes: Use it inside your dvc repo!

It receives an --input vega spec and --output folder

```sh
vegametrics --help
```
