# DVC Github action for CD4ML [![GitHub Actions Workflow](https://github.com/iterative/dvc-action/workflows/dvc-action/badge.svg)](https://github.com/iterative/dvc-action/actions)

DVC is a great tool as a data versioning system, but also is great as a build tool for ML experimentation. This action offers the possibility of using DVC to stablish your ML pipeline to be runned by Github Actions CI/CD were you could use your own runners with special capabilities like GPUs. Think on Gradle or Maven for ML.

The action performs:

 - Generates a DVC report as a github check.
 - Automatic commit and push to git and dvc once the pipeline runs.
 - Generates an experiment release with metrics as changelog (COMING SOON).

## Input variables

Variable | Required | Default | Info
--- | --- | --- | ---
github_token | yes |  | Is the github_token, this is normally setted automatically by github as a secret.
dvc_repro_file | no | Dvcfile | If a file is given dvc will run the pipeline
dvc_repro_skip | no | false | Skips reproducing the pipeline

### [ci skip] support
If your commit comment includes the tag the dvc action will skip returning a 0 status code (success). Github is only accepting 0 or 1 as status codes. Any value like 78 for neutral is invalid.

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
```

As stated before if you just need to track your data without doing repro this could be an example:

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
          dvc_repro_skip: true
```
