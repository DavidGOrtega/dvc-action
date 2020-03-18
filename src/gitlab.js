const { exec } = require('./utils');
const CI = require('./CI');

const {
  CI_API_V4_URL,
  CI_PROJECT_PATH,
  CI_COMMIT_REF_NAME,
  CI_COMMIT_SHA,
  // CI_COMMIT_BEFORE_SHA,
  GITLAB_TOKEN,
  GITLAB_USER_EMAIL,
  GITLAB_USER_NAME
} = process.env;

const [owner, repo] = CI_PROJECT_PATH.split('/');
const IS_PR = false;
const REF = CI_COMMIT_REF_NAME;
const HEAD_SHA = CI_COMMIT_SHA;
const USER_EMAIL = GITLAB_USER_EMAIL;
const USER_NAME = GITLAB_USER_NAME;
const REMOTE = `https://${owner}:${GITLAB_TOKEN}@gitlab.com/${owner}/${repo}.git`;

const ref_parser = async ref => {
  const tag = CI.sha_tag(ref);
  const uri = `${CI_API_V4_URL}/${CI_PROJECT_PATH}/-/tags/${tag}`;

  return uri;
};

const check_ran_ref = async opts => {
  console.log('Not yet implemented.');
};

const git_fetch_all = async () => {
  await exec('git checkout -B "$CI_BUILD_REF_NAME" "$CI_BUILD_REF"');
  await exec('git fetch --prune');
};

const publish_report = async opts => {
  const { repro_sha, report } = opts;

  if (!repro_sha) return;

  const data = JSON.stringify({ description: report });
  const endpoint = `${CI_API_V4_URL}/${CI_PROJECT_PATH}/releases/${CI.sha_tag(
    repro_sha
  )}`;
  await exec(
    `curl --header 'Content-Type: application/json' --header "PRIVATE-TOKEN: ${GITLAB_TOKEN}" --request PUT --data ${data} "${endpoint}"`
  );
};

const handle_error = e => {
  console.log(e.message);
  process.exit(1);
};

exports.is_pr = IS_PR;
exports.ref = REF;
exports.head_sha = HEAD_SHA;
exports.user_email = USER_EMAIL;
exports.user_name = USER_NAME;
exports.remote = REMOTE;
exports.ref_parser = ref_parser;
exports.check_ran_ref = check_ran_ref;
exports.git_fetch_all = git_fetch_all;
exports.publish_report = publish_report;
exports.handle_error = handle_error;
