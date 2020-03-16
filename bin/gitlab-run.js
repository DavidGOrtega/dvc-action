#!/usr/bin/env node

const { exec } = require('./../src/utils');
const DVC = require('./../src/dvc');
const CI = require('./../src/ci');

const {
  CI_PROJECT_PATH,
  CI_COMMIT_REF_NAME,
  // CI_COMMIT_SHA,
  // CI_COMMIT_BEFORE_SHA,
  GITLAB_TOKEN,
  GITLAB_USER_EMAIL,
  GITLAB_USER_NAME
} = process.env;

const getInputArray = (key, default_value) => {
  return process.env[key]
    ? process.env[key].split(/[ ,]+/)
    : default_value || [];
};

const run = async () => {
  const [owner, repo] = CI_PROJECT_PATH.split('/');
  const ref = CI_COMMIT_REF_NAME;

  const user_email = GITLAB_USER_EMAIL;
  const user_name = GITLAB_USER_NAME;
  const remote = `https://${owner}:${GITLAB_TOKEN}@gitlab.com/${owner}/${repo}.git`;

  const dvc_pull = process.env.dvc_pull || true;
  const repro_targets = getInputArray('repro_targets', ['Dvcfile']);
  const metrics_diff_targets = getInputArray('metrics_diff_targets');
  const from = process.env.rev || 'origin/master';

  if (await CI.commit_skip_ci()) {
    console.log(`${CI.SKIP} found; skipping task`);
    return;
  }

  console.log('Fetch all history for all tags and branches');
  await exec('git checkout -B "$CI_BUILD_REF_NAME" "$CI_BUILD_REF"');
  await exec('git fetch --prune');

  await DVC.setup();
  await DVC.setup_remote({ dvc_pull });

  const repro_ran = await CI.run_dvc_repro_push({
    user_email,
    user_name,
    remote,
    ref,
    repro_targets
  });

  console.log('Generating DVC Report');
  const to = repro_ran || '';
  const dvc_report_out = await CI.dvc_report({
    from,
    to,
    metrics_diff_targets
  });

  console.log(dvc_report_out);
};

run().catch(e => {
  console.log(e.message);
  process.exit(1);
});
