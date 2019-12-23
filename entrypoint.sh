#!/bin/bash

set -e

COMMIT_FILTER="[ci skip]"
# Skip if commit filter
readonly local last_commit_log=$(git log -1)
readonly local filter_count=$(echo "$last_commit_log" | grep -c "$COMMIT_FILTER" )
if ! [[ "$filter_count" -eq 0 ]]; then
  echo "[ci skip] found!"
  exit 0 # exit 78 # 78 is neutral github code 
fi

dvc_file=${dvc_file:-Dvcfile}
echo Pulling from dvc repo...
dvc pull

echo Runnig dvc repro ${dvc_file}
dvc repro ${dvc_file}

if ! git diff-index --quiet HEAD --; then
    echo Pushing to repo
    
    git config --local user.email "action@github.com"
    git config --local user.name "GitHub Action"
    git commit -m "dvc repro ${COMMIT_FILTER}" -a
    git remote add github "https://$GITHUB_ACTOR:$github_token@github.com/$GITHUB_REPOSITORY.git"
    git push github HEAD:${GITHUB_REF}

    if [ "${dvc_push:-true}" = true ] ; then
        echo Pushing to dvc repo
        dvc push
    fi
fi
